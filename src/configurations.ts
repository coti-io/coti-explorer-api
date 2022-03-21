export const corsConfig = {
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3006', 'https://explorer-qa.coti.io', 'https://explorer.coti.io', '*'],
  credentials: true,
};

export const appModuleConfig = {
  cors: corsConfig,
};
