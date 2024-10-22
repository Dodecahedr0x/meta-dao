import { AnchorProvider, IdlTypes, Program } from "@coral-xyz/anchor";
import {
  AccountInfo,
  AddressLookupTableAccount,
  Keypair,
  PublicKey,
} from "@solana/web3.js";

import { Amm as AmmIDLType, IDL as AmmIDL } from "./types/amm.js";

import BN from "bn.js";
import { AMM_PROGRAM_ID } from "./constants.js";
import { Amm, LowercaseKeys } from "./types/index.js";
import { getAmmLpMintAddr, getAmmAddr } from "./utils/pda.js";
// import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";
import {
  MintLayout,
  unpackMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { PriceMath } from "./utils/priceMath.js";

export type SwapType = LowercaseKeys<IdlTypes<AmmIDLType>["SwapType"]>;

export type CreateAmmClientParams = {
  provider: AnchorProvider;
  ammProgramId?: PublicKey;
};

export type AddLiquiditySimulation = {
  baseAmount: BN;
  quoteAmount: BN;
  expectedLpTokens: BN;
  minLpTokens?: BN;
  maxBaseAmount?: BN;
};

export type SwapSimulation = {
  expectedOut: BN;
  newBaseReserves: BN;
  newQuoteReserves: BN;
  minExpectedOut?: BN;
};

export type RemoveLiquiditySimulation = {
  expectedBaseOut: BN;
  expectedQuoteOut: BN;
  minBaseOut?: BN;
  minQuoteOut?: BN;
};

export class AmmClient {
  public readonly provider: AnchorProvider;
  public readonly program: Program<AmmIDLType>;
  public readonly luts: AddressLookupTableAccount[];

  constructor(
    provider: AnchorProvider,
    ammProgramId: PublicKey,
    luts: AddressLookupTableAccount[]
  ) {
    this.provider = provider;
    this.program = new Program<AmmIDLType>(AmmIDL, ammProgramId, provider);
    this.luts = luts;
  }

  public static createClient(
    createAutocratClientParams: CreateAmmClientParams
  ): AmmClient {
    let { provider, ammProgramId: programId } = createAutocratClientParams;

    const luts: AddressLookupTableAccount[] = [];

    return new AmmClient(provider, programId || AMM_PROGRAM_ID, luts);
  }

  getProgramId(): PublicKey {
    return this.program.programId;
  }

  async getAmm(amm: PublicKey): Promise<Amm> {
    return await this.program.account.amm.fetch(amm);
  }

  async fetchAmm(amm: PublicKey): Promise<Amm | null> {
    return await this.program.account.amm.fetchNullable(amm);
  }

  async deserializeAmm(accountInfo: AccountInfo<Buffer>): Promise<Amm> {
    return this.program.coder.accounts.decode("amm", accountInfo.data);
  }

  async createAmm(
    proposal: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    twapInitialObservation: number,
    twapMaxObservationChangePerUpdate?: number
  ): Promise<PublicKey> {
    if (!twapMaxObservationChangePerUpdate) {
      twapMaxObservationChangePerUpdate = twapInitialObservation * 0.02;
    }
    let [amm] = getAmmAddr(this.getProgramId(), baseMint, quoteMint);

    let baseDecimals = unpackMint(
      baseMint,
      await this.provider.connection.getAccountInfo(baseMint)
    ).decimals;
    let quoteDecimals = unpackMint(
      quoteMint,
      await this.provider.connection.getAccountInfo(quoteMint)
    ).decimals;

    let [twapFirstObservationScaled, twapMaxObservationChangePerUpdateScaled] =
      PriceMath.getAmmPrices(
        baseDecimals,
        quoteDecimals,
        twapInitialObservation,
        twapMaxObservationChangePerUpdate
      );

    await this.initializeAmmIx(
      baseMint,
      quoteMint,
      twapFirstObservationScaled,
      twapMaxObservationChangePerUpdateScaled
    ).rpc();

    return amm;
  }

  // both twap values need to be scaled beforehand
  initializeAmmIx(
    baseMint: PublicKey,
    quoteMint: PublicKey,
    twapInitialObservation: BN,
    twapMaxObservationChangePerUpdate: BN
  ) {
    let [amm] = getAmmAddr(this.getProgramId(), baseMint, quoteMint);
    let [lpMint] = getAmmLpMintAddr(this.getProgramId(), amm);

    let vaultAtaBase = getAssociatedTokenAddressSync(baseMint, amm, true);
    let vaultAtaQuote = getAssociatedTokenAddressSync(quoteMint, amm, true);

    return this.program.methods
      .createAmm({
        twapInitialObservation,
        twapMaxObservationChangePerUpdate,
      })
      .accounts({
        user: this.provider.publicKey,
        amm,
        lpMint,
        baseMint,
        quoteMint,
        vaultAtaBase,
        vaultAtaQuote,
      });
  }

  async addLiquidity(
    amm: PublicKey,
    quoteAmount?: number,
    baseAmount?: number
  ) {
    let storedAmm = await this.getAmm(amm);

    let lpMintSupply = unpackMint(
      storedAmm.lpMint,
      await this.provider.connection.getAccountInfo(storedAmm.lpMint)
    ).supply;

    let quoteAmountCasted: BN | undefined;
    let baseAmountCasted: BN | undefined;

    if (quoteAmount != undefined) {
      let quoteDecimals = unpackMint(
        storedAmm.quoteMint,
        await this.provider.connection.getAccountInfo(storedAmm.quoteMint)
      ).decimals;
      quoteAmountCasted = new BN(quoteAmount).mul(
        new BN(10).pow(new BN(quoteDecimals))
      );
    }

    if (baseAmount != undefined) {
      let baseDecimals = unpackMint(
        storedAmm.baseMint,
        await this.provider.connection.getAccountInfo(storedAmm.baseMint)
      ).decimals;
      baseAmountCasted = new BN(baseAmount).mul(
        new BN(10).pow(new BN(baseDecimals))
      );
    }

    if (lpMintSupply == 0n) {
      if (quoteAmount == undefined || baseAmount == undefined) {
        throw new Error(
          "No pool created yet, you need to specify both base and quote"
        );
      }

      // console.log(quoteAmountCasted?.toString());
      // console.log(baseAmountCasted?.toString())

      return await this.addLiquidityIx(
        amm,
        storedAmm.baseMint,
        storedAmm.quoteMint,
        quoteAmountCasted as BN,
        baseAmountCasted as BN,
        new BN(0)
      ).rpc();
    }

    //   quoteAmount == undefined ? undefined : new BN(quoteAmount);
    // let baseAmountCasted: BN | undefined =
    //   baseAmount == undefined ? undefined : new BN(baseAmount);

    let sim = this.simulateAddLiquidity(
      storedAmm.baseAmount,
      storedAmm.quoteAmount,
      Number(lpMintSupply),
      baseAmountCasted,
      quoteAmountCasted
    );

    await this.addLiquidityIx(
      amm,
      storedAmm.baseMint,
      storedAmm.quoteMint,
      sim.quoteAmount,
      sim.baseAmount,
      sim.expectedLpTokens
    ).rpc();
  }

  addLiquidityIx(
    amm: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    quoteAmount: BN,
    maxBaseAmount: BN,
    minLpTokens: BN,
    user: PublicKey = this.provider.publicKey
  ) {
    const [lpMint] = getAmmLpMintAddr(this.program.programId, amm);

    const userLpAccount = getAssociatedTokenAddressSync(lpMint, user);

    return this.program.methods
      .addLiquidity({
        quoteAmount,
        maxBaseAmount,
        minLpTokens,
      })
      .accounts({
        user,
        amm,
        lpMint,
        userLpAccount,
        userBaseAccount: getAssociatedTokenAddressSync(baseMint, user),
        userQuoteAccount: getAssociatedTokenAddressSync(quoteMint, user),
        vaultAtaBase: getAssociatedTokenAddressSync(baseMint, amm, true),
        vaultAtaQuote: getAssociatedTokenAddressSync(quoteMint, amm, true),
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          this.provider.publicKey,
          userLpAccount,
          this.provider.publicKey,
          lpMint
        ),
      ]);
  }

  removeLiquidityIx(
    ammAddr: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    lpTokensToBurn: BN,
    minBaseAmount: BN,
    minQuoteAmount: BN
  ) {
    const [lpMint] = getAmmLpMintAddr(this.program.programId, ammAddr);

    return this.program.methods
      .removeLiquidity({
        lpTokensToBurn,
        minBaseAmount,
        minQuoteAmount,
      })
      .accounts({
        user: this.provider.publicKey,
        amm: ammAddr,
        lpMint,
        userLpAccount: getAssociatedTokenAddressSync(
          lpMint,
          this.provider.publicKey
        ),
        userBaseAccount: getAssociatedTokenAddressSync(
          baseMint,
          this.provider.publicKey
        ),
        userQuoteAccount: getAssociatedTokenAddressSync(
          quoteMint,
          this.provider.publicKey
        ),
        vaultAtaBase: getAssociatedTokenAddressSync(baseMint, ammAddr, true),
        vaultAtaQuote: getAssociatedTokenAddressSync(quoteMint, ammAddr, true),
      });
  }

  async swap(
    amm: PublicKey,
    swapType: SwapType,
    inputAmount: number,
    outputAmountMin: number
  ) {
    const storedAmm = await this.getAmm(amm);

    let quoteDecimals = await this.getDecimals(storedAmm.quoteMint);
    let baseDecimals = await this.getDecimals(storedAmm.baseMint);

    let inputAmountScaled: BN;
    let outputAmountMinScaled: BN;
    if (swapType.buy) {
      inputAmountScaled = PriceMath.scale(inputAmount, quoteDecimals);
      outputAmountMinScaled = PriceMath.scale(outputAmountMin, baseDecimals);
    } else {
      inputAmountScaled = PriceMath.scale(inputAmount, baseDecimals);
      outputAmountMinScaled = PriceMath.scale(outputAmountMin, quoteDecimals);
    }

    return await this.swapIx(
      amm,
      storedAmm.baseMint,
      storedAmm.quoteMint,
      swapType,
      inputAmountScaled,
      outputAmountMinScaled
    ).rpc();
  }

  swapIx(
    amm: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    swapType: SwapType,
    inputAmount: BN,
    outputAmountMin: BN,
    user: PublicKey = this.provider.publicKey
  ) {
    const receivingToken = swapType.buy ? baseMint : quoteMint;

    return this.program.methods
      .swap({
        swapType,
        inputAmount,
        outputAmountMin,
      })
      .accounts({
        user,
        amm,
        userBaseAccount: getAssociatedTokenAddressSync(baseMint, user, true),
        userQuoteAccount: getAssociatedTokenAddressSync(quoteMint, user, true),
        vaultAtaBase: getAssociatedTokenAddressSync(baseMint, amm, true),
        vaultAtaQuote: getAssociatedTokenAddressSync(quoteMint, amm, true),
      })
      .preInstructions([
        // create the receiving token account if it doesn't exist
        createAssociatedTokenAccountIdempotentInstruction(
          this.provider.publicKey,
          getAssociatedTokenAddressSync(receivingToken, user),
          user,
          receivingToken
        ),
      ]);
  }

  async crankThatTwap(amm: PublicKey) {
    return this.crankThatTwapIx(amm).rpc();
  }

  crankThatTwapIx(amm: PublicKey) {
    return this.program.methods.crankThatTwap().accounts({
      amm,
    });
  }

  // getter functions

  // async getLTWAP(ammAddr: PublicKey): Promise<number> {
  //   const amm = await this.program.account.amm.fetch(ammAddr);
  //   return amm.twapLastObservationUq64X32
  //     .div(new BN(2).pow(new BN(32)))
  //     .toNumber();
  // }

  getTwap(amm: Amm): BN {
    return amm.oracle.aggregator.div(
      amm.oracle.lastUpdatedSlot.sub(amm.createdAtSlot)
    );
  }

  simulateAddLiquidity(
    baseReserves: BN,
    quoteReserves: BN,
    lpMintSupply: number,
    baseAmount?: BN,
    quoteAmount?: BN,
    slippageBps?: BN
  ): AddLiquiditySimulation {
    if (lpMintSupply == 0) {
      throw new Error(
        "This AMM doesn't have existing liquidity so we can't fill in the blanks"
      );
    }

    if (baseAmount == undefined && quoteAmount == undefined) {
      throw new Error("Must specify either a base amount or a quote amount");
    }

    let expectedLpTokens: BN;

    if (quoteAmount == undefined) {
      quoteAmount = baseAmount?.mul(quoteReserves).div(baseReserves);
    }
    baseAmount = quoteAmount?.mul(baseReserves).div(quoteReserves).addn(1);

    expectedLpTokens = quoteAmount
      ?.mul(new BN(lpMintSupply))
      .div(quoteReserves) as BN;

    let minLpTokens, maxBaseAmount;
    if (slippageBps) {
      minLpTokens = PriceMath.subtractSlippage(expectedLpTokens, slippageBps);
      maxBaseAmount = PriceMath.addSlippage(baseAmount as BN, slippageBps);
    }

    return {
      quoteAmount: quoteAmount as BN,
      baseAmount: baseAmount as BN,
      expectedLpTokens,
      minLpTokens,
      maxBaseAmount,
    };
  }

  simulateSwapInner(
    inputAmount: BN,
    inputReserves: BN,
    outputReserves: BN
  ): BN {
    if (inputReserves.eqn(0) || outputReserves.eqn(0)) {
      throw new Error("reserves must be non-zero");
    }

    let inputAmountWithFee: BN = inputAmount.muln(990);

    let numerator: BN = inputAmountWithFee.mul(outputReserves);
    let denominator: BN = inputReserves.muln(1000).add(inputAmountWithFee);

    return numerator.div(denominator);
  }

  simulateSwap(
    inputAmount: BN,
    swapType: SwapType,
    baseReserves: BN,
    quoteReserves: BN,
    slippageBps?: BN
  ): SwapSimulation {
    let inputReserves: BN, outputReserves: BN;
    if (swapType.buy) {
      inputReserves = quoteReserves;
      outputReserves = baseReserves;
    } else {
      inputReserves = baseReserves;
      outputReserves = quoteReserves;
    }

    let expectedOut = this.simulateSwapInner(
      inputAmount,
      inputReserves,
      outputReserves
    );

    let minExpectedOut;
    if (slippageBps) {
      minExpectedOut = PriceMath.subtractSlippage(expectedOut, slippageBps);
    }

    let newBaseReserves: BN, newQuoteReserves: BN;
    if (swapType.buy) {
      newBaseReserves = baseReserves.sub(expectedOut);
      newQuoteReserves = quoteReserves.add(inputAmount);
    } else {
      newBaseReserves = baseReserves.add(inputAmount);
      newQuoteReserves = quoteReserves.sub(expectedOut);
    }

    return {
      expectedOut,
      newBaseReserves,
      newQuoteReserves,
      minExpectedOut,
    };
  }

  simulateRemoveLiquidity(
    lpTokensToBurn: BN,
    baseReserves: BN,
    quoteReserves: BN,
    lpTotalSupply: BN,
    slippageBps?: BN
  ): RemoveLiquiditySimulation {
    const expectedBaseOut = lpTokensToBurn.mul(baseReserves).div(lpTotalSupply);
    const expectedQuoteOut = lpTokensToBurn
      .mul(quoteReserves)
      .div(lpTotalSupply);

    let minBaseOut, minQuoteOut;
    if (slippageBps) {
      minBaseOut = PriceMath.subtractSlippage(expectedBaseOut, slippageBps);
      minQuoteOut = PriceMath.subtractSlippage(expectedQuoteOut, slippageBps);
    }

    return {
      expectedBaseOut,
      expectedQuoteOut,
      minBaseOut,
      minQuoteOut,
    };
  }

  async getDecimals(mint: PublicKey): Promise<number> {
    return unpackMint(mint, await this.provider.connection.getAccountInfo(mint))
      .decimals;
  }

  /**
   * Calculates the optimal swap amount and mergeable tokens without using square roots.
   * @param userBalanceIn BN – Tokens that a user wants to dispose of.
   * @param ammReserveIn BN – Amount of tokens in the AMM of the token that the user wants to dispose of.
   * @param ammReserveOut BN – Amount of tokens in the AMM of the token that the user wants to receive.
   * @returns An object containing the optimal swap amount, expected quote received, and expected mergeable tokens.
   */

  calculateOptimalSwapForMerge(
    userBalanceIn: BN,
    ammReserveIn: BN,
    ammReserveOut: BN,
    slippageBps: BN
  ): {
    optimalSwapAmount: BN;
    userInAfterSwap: BN;
    expectedOut: BN;
    minimumExpectedOut: BN;
  } {
    // essentially, we want to calculate the swap amount so that the remaining user balance = received token amount

    // solve this system of equations for swapAmount, outputAmount (we only care about swap amount tho)
    // (baseReserve + swapAmount) * (quoteReserve - outputAmount) = baseReserve * quoteReserve
    // baseAmount - swapAmount = outputAmount

    //solve equation
    // (baseReserve + .99*swapAmount) * (quoteReserve - (userTokens - swapAmount)) = baseReserve * quoteReserve
    // multiplying out the left hand side and subtracting baseReserve * quoteReserve from both sides yields the following:
    // baseReserve*quoteReserve - baseReserve*userTokens + baseReserve*swapAmount + .99*swapAmount*quoteReserve - .99*swapAmount*userTokens + .99*swapAmount^2 = baseReserve*quoteReserve
    // .99*swapAmount^2 + baseReserve*swapAmount + .99*swapAmount*quoteReserve - baseReserve*userTokens - .99*swapAmount*userTokens = 0
    // in the quadratic equation, a = .99, b = (baseReserve + .99*quoteReserve - .99*userTokens), c = -baseReserve*userTokens
    // x = (-b + sqrt(b^2 - 4ac)) / 2a

    let a = 0.99;
    let b =
      Number(ammReserveIn) +
      0.99 * Number(ammReserveOut) -
      0.99 * Number(userBalanceIn);
    let c = -Number(ammReserveIn) * Number(userBalanceIn);

    let x = (-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a);
    //this should mathematically return a positive number assuming userBalanceIn, ammReserveIn, and ammReserveOut are all positive (which they should be)
    // -b + Math.sqrt(b ** 2 - 4 * a * c) > 0 because -4*a*c > 0 and sqrt(b**2 + positive number) > b

    const swapAmount = x;

    let expectedOut = this.simulateSwapInner(
      new BN(swapAmount),
      ammReserveIn,
      ammReserveOut
    );
    let minimumExpectedOut =
      Number(expectedOut) - (Number(expectedOut) * Number(slippageBps)) / 10000;
    return {
      optimalSwapAmount: new BN(swapAmount),
      userInAfterSwap: new BN(Number(userBalanceIn) - swapAmount),
      expectedOut: expectedOut,
      minimumExpectedOut: new BN(minimumExpectedOut),
    };
  }
}
