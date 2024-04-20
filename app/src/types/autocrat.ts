export type Autocrat = {
  "version": "1.0.0",
  "name": "autocrat",
  "instructions": [
    {
      "name": "initializeDao",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "InitializeDaoParams"
          }
        }
      ]
    },
    {
      "name": "initializeProposal",
      "accounts": [
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "baseVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "passAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "failAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "descriptionUrl",
          "type": "string"
        },
        {
          "name": "instruction",
          "type": {
            "defined": "ProposalInstruction"
          }
        }
      ]
    },
    {
      "name": "finalizeProposal",
      "accounts": [
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "passAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "failAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dao",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "baseVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TODO: use a different thing to prevent collision"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "executeProposal",
      "accounts": [
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "dao",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "updateDao",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "daoParams",
          "type": {
            "defined": "UpdateDaoParams"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "dao",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasuryPdaBump",
            "type": "u8"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "usdcMint",
            "type": "publicKey"
          },
          {
            "name": "proposalCount",
            "type": "u32"
          },
          {
            "name": "passThresholdBps",
            "type": "u16"
          },
          {
            "name": "slotsPerProposal",
            "type": "u64"
          },
          {
            "name": "twapInitialObservation",
            "docs": [
              "For manipulation-resistance the TWAP is a time-weighted average observation,",
              "where observation tries to approximate price but can only move by",
              "`twap_max_observation_change_per_update` per update. Because it can only move",
              "a little bit per update, you need to check that it has a good initial observation.",
              "Otherwise, an attacker could create a very high initial observation in the pass",
              "market and a very low one in the fail market to force the proposal to pass.",
              "",
              "We recommend setting an initial observation around the spot price of the token,",
              "and max observation change per update around 2% the spot price of the token.",
              "For example, if the spot price of META is $400, we'd recommend setting an initial",
              "observation of 400 (converted into the AMM prices) and a max observation change per",
              "update of 8 (also converted into the AMM prices). Observations can be updated once",
              "a minute, so 2% allows the proposal market to reach double the spot price or 0",
              "in 50 minutes."
            ],
            "type": "u128"
          },
          {
            "name": "twapMaxObservationChangePerUpdate",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "number",
            "type": "u32"
          },
          {
            "name": "proposer",
            "type": "publicKey"
          },
          {
            "name": "descriptionUrl",
            "type": "string"
          },
          {
            "name": "slotEnqueued",
            "type": "u64"
          },
          {
            "name": "state",
            "type": {
              "defined": "ProposalState"
            }
          },
          {
            "name": "instruction",
            "type": {
              "defined": "ProposalInstruction"
            }
          },
          {
            "name": "passAmm",
            "type": "publicKey"
          },
          {
            "name": "failAmm",
            "type": "publicKey"
          },
          {
            "name": "baseVault",
            "type": "publicKey"
          },
          {
            "name": "quoteVault",
            "type": "publicKey"
          },
          {
            "name": "dao",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeDaoParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "twapInitialObservation",
            "type": "u128"
          },
          {
            "name": "twapMaxObservationChangePerUpdate",
            "type": "u128"
          },
          {
            "name": "passThresholdBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "slotsPerProposal",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateDaoParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "passThresholdBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "slotsPerProposal",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "twapInitialObservation",
            "type": {
              "option": "u128"
            }
          },
          {
            "name": "twapMaxObservationChangePerUpdate",
            "type": {
              "option": "u128"
            }
          }
        ]
      }
    },
    {
      "name": "ProposalAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "ProposalInstruction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "publicKey"
          },
          {
            "name": "accounts",
            "type": {
              "vec": {
                "defined": "ProposalAccount"
              }
            }
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "ProposalState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Passed"
          },
          {
            "name": "Failed"
          },
          {
            "name": "Executed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidMarket",
      "msg": "Either the `pass_market` or the `fail_market`'s tokens doesn't match the vaults supplied"
    },
    {
      "code": 6001,
      "name": "TWAPMarketTooOld",
      "msg": "`TWAPMarket` must have an `initial_slot` within 50 slots of the proposal's `slot_enqueued`"
    },
    {
      "code": 6002,
      "name": "TWAPOracleWrongChangeLots",
      "msg": "`TWAPOracle` has an incorrect max_observation_change_per_update_lots value"
    },
    {
      "code": 6003,
      "name": "TWAPMarketInvalidExpectedValue",
      "msg": "`TWAPMarket` has the wrong `expected_value`"
    },
    {
      "code": 6004,
      "name": "InvalidSettlementAuthority",
      "msg": "One of the vaults has an invalid `settlement_authority`"
    },
    {
      "code": 6005,
      "name": "ProposalTooYoung",
      "msg": "Proposal is too young to be executed or rejected"
    },
    {
      "code": 6006,
      "name": "MarketsTooYoung",
      "msg": "Markets too young for proposal to be finalized. TWAP might need to be cranked"
    },
    {
      "code": 6007,
      "name": "ProposalAlreadyFinalized",
      "msg": "This proposal has already been finalized"
    },
    {
      "code": 6008,
      "name": "InvalidVaultNonce",
      "msg": "A conditional vault has an invalid nonce. A nonce should encode the proposal number"
    },
    {
      "code": 6009,
      "name": "ProposalNotPassed",
      "msg": "This proposal can't be executed because it isn't in the passed state"
    }
  ]
};

export const IDL: Autocrat = {
  "version": "1.0.0",
  "name": "autocrat",
  "instructions": [
    {
      "name": "initializeDao",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "InitializeDaoParams"
          }
        }
      ]
    },
    {
      "name": "initializeProposal",
      "accounts": [
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "baseVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "passAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "failAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "descriptionUrl",
          "type": "string"
        },
        {
          "name": "instruction",
          "type": {
            "defined": "ProposalInstruction"
          }
        }
      ]
    },
    {
      "name": "finalizeProposal",
      "accounts": [
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "passAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "failAmm",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dao",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "baseVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "TODO: use a different thing to prevent collision"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "executeProposal",
      "accounts": [
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "dao",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "updateDao",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "daoTreasury",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "daoParams",
          "type": {
            "defined": "UpdateDaoParams"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "dao",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasuryPdaBump",
            "type": "u8"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "usdcMint",
            "type": "publicKey"
          },
          {
            "name": "proposalCount",
            "type": "u32"
          },
          {
            "name": "passThresholdBps",
            "type": "u16"
          },
          {
            "name": "slotsPerProposal",
            "type": "u64"
          },
          {
            "name": "twapInitialObservation",
            "docs": [
              "For manipulation-resistance the TWAP is a time-weighted average observation,",
              "where observation tries to approximate price but can only move by",
              "`twap_max_observation_change_per_update` per update. Because it can only move",
              "a little bit per update, you need to check that it has a good initial observation.",
              "Otherwise, an attacker could create a very high initial observation in the pass",
              "market and a very low one in the fail market to force the proposal to pass.",
              "",
              "We recommend setting an initial observation around the spot price of the token,",
              "and max observation change per update around 2% the spot price of the token.",
              "For example, if the spot price of META is $400, we'd recommend setting an initial",
              "observation of 400 (converted into the AMM prices) and a max observation change per",
              "update of 8 (also converted into the AMM prices). Observations can be updated once",
              "a minute, so 2% allows the proposal market to reach double the spot price or 0",
              "in 50 minutes."
            ],
            "type": "u128"
          },
          {
            "name": "twapMaxObservationChangePerUpdate",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "number",
            "type": "u32"
          },
          {
            "name": "proposer",
            "type": "publicKey"
          },
          {
            "name": "descriptionUrl",
            "type": "string"
          },
          {
            "name": "slotEnqueued",
            "type": "u64"
          },
          {
            "name": "state",
            "type": {
              "defined": "ProposalState"
            }
          },
          {
            "name": "instruction",
            "type": {
              "defined": "ProposalInstruction"
            }
          },
          {
            "name": "passAmm",
            "type": "publicKey"
          },
          {
            "name": "failAmm",
            "type": "publicKey"
          },
          {
            "name": "baseVault",
            "type": "publicKey"
          },
          {
            "name": "quoteVault",
            "type": "publicKey"
          },
          {
            "name": "dao",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeDaoParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "twapInitialObservation",
            "type": "u128"
          },
          {
            "name": "twapMaxObservationChangePerUpdate",
            "type": "u128"
          },
          {
            "name": "passThresholdBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "slotsPerProposal",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateDaoParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "passThresholdBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "slotsPerProposal",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "twapInitialObservation",
            "type": {
              "option": "u128"
            }
          },
          {
            "name": "twapMaxObservationChangePerUpdate",
            "type": {
              "option": "u128"
            }
          }
        ]
      }
    },
    {
      "name": "ProposalAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "ProposalInstruction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "publicKey"
          },
          {
            "name": "accounts",
            "type": {
              "vec": {
                "defined": "ProposalAccount"
              }
            }
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "ProposalState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Passed"
          },
          {
            "name": "Failed"
          },
          {
            "name": "Executed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidMarket",
      "msg": "Either the `pass_market` or the `fail_market`'s tokens doesn't match the vaults supplied"
    },
    {
      "code": 6001,
      "name": "TWAPMarketTooOld",
      "msg": "`TWAPMarket` must have an `initial_slot` within 50 slots of the proposal's `slot_enqueued`"
    },
    {
      "code": 6002,
      "name": "TWAPOracleWrongChangeLots",
      "msg": "`TWAPOracle` has an incorrect max_observation_change_per_update_lots value"
    },
    {
      "code": 6003,
      "name": "TWAPMarketInvalidExpectedValue",
      "msg": "`TWAPMarket` has the wrong `expected_value`"
    },
    {
      "code": 6004,
      "name": "InvalidSettlementAuthority",
      "msg": "One of the vaults has an invalid `settlement_authority`"
    },
    {
      "code": 6005,
      "name": "ProposalTooYoung",
      "msg": "Proposal is too young to be executed or rejected"
    },
    {
      "code": 6006,
      "name": "MarketsTooYoung",
      "msg": "Markets too young for proposal to be finalized. TWAP might need to be cranked"
    },
    {
      "code": 6007,
      "name": "ProposalAlreadyFinalized",
      "msg": "This proposal has already been finalized"
    },
    {
      "code": 6008,
      "name": "InvalidVaultNonce",
      "msg": "A conditional vault has an invalid nonce. A nonce should encode the proposal number"
    },
    {
      "code": 6009,
      "name": "ProposalNotPassed",
      "msg": "This proposal can't be executed because it isn't in the passed state"
    }
  ]
};
