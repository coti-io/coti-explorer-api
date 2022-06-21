export const corsConfig = {
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3006',
    'http://localhost:3009',
    'https://explorer-qa.coti.io',
    'https://explorer-staging.coti.io',
    'https://explorer.coti.io',
    'https://foxnet-explorer.coti.io',
    'https://foxnet-wallet.coti.io',
  ],
  credentials: false,
};

export const appModuleConfig = {
  cors: corsConfig,
};
