import { base } from 'wagmi/chains'

export const pizzaPartyChain = {
  ...base,
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://mainnet.base.org'] },
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    etherscan: { name: 'Basescan', url: 'https://basescan.org' },
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
}

export { base } 