const abi = [
  {
    inputs: [
      { internalType: 'address', name: '_core', type: 'address' },
      { internalType: 'address', name: '_oracle', type: 'address' },
      { internalType: 'address', name: '_pair', type: 'address' },
      { internalType: 'address', name: '_router', type: 'address' },
      { internalType: 'uint32', name: '_growthRate', type: 'uint32' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_core',
        type: 'address',
      },
    ],
    name: 'CoreUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: '_isExempt', type: 'bool' },
    ],
    name: 'ExemptAddressUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: '_growthRate',
        type: 'uint256',
      },
    ],
    name: 'GrowthRateUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_oracle',
        type: 'address',
      },
    ],
    name: 'OracleUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_pair',
        type: 'address',
      },
    ],
    name: 'PairUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: '_weight',
        type: 'uint256',
      },
      { indexed: false, internalType: 'bool', name: '_active', type: 'bool' },
    ],
    name: 'TimeWeightUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    inputs: [],
    name: 'TIME_WEIGHT_GRANULARITY',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'core',
    outputs: [{ internalType: 'contract ICore', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'price',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'peg',
        type: 'tuple',
      },
    ],
    name: 'deviationBelowPeg',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fei',
    outputs: [{ internalType: 'contract IFei', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feiBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'getBuyIncentive',
    outputs: [
      { internalType: 'uint256', name: 'incentive', type: 'uint256' },
      { internalType: 'uint32', name: 'weight', type: 'uint32' },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '_initialDeviation',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '_finalDeviation',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'initialDeviation',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'finalDeviation',
        type: 'tuple',
      },
    ],
    name: 'getBuyIncentiveMultiplier',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getGrowthRate',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint256', name: 'feiReserves', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenReserves', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'getSellPenalty',
    outputs: [
      { internalType: 'uint256', name: 'penalty', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '_initialDeviation',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '_finalDeviation',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'initialDeviation',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'finalDeviation',
        type: 'tuple',
      },
    ],
    name: 'getSellPenaltyMultiplier',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTimeWeight',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
    ],
    name: 'incentivize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: 'price',
        type: 'tuple',
      },
    ],
    name: 'invert',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'isExemptAddress',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isIncentiveParity',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isTimeWeightActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidityOwned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'oracle',
    outputs: [{ internalType: 'contract IOracle', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pair',
    outputs: [
      { internalType: 'contract IUniswapV2Pair_3', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'peg',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct Decimal.D256',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'router',
    outputs: [
      {
        internalType: 'contract IUniswapV2Router02_2',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'core', type: 'address' }],
    name: 'setCore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'bool', name: 'isExempt', type: 'bool' },
    ],
    name: 'setExemptAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_oracle', type: 'address' }],
    name: 'setOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_pair', type: 'address' }],
    name: 'setPair',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint32', name: 'weight', type: 'uint32' },
      { internalType: 'uint32', name: 'growth', type: 'uint32' },
      { internalType: 'bool', name: 'active', type: 'bool' },
    ],
    name: 'setTimeWeight',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint32', name: 'growthRate', type: 'uint32' }],
    name: 'setTimeWeightGrowth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tribe',
    outputs: [{ internalType: 'contract IERC20_5', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tribeBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'updateOracle',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export default abi
