import { cleanEnv, str } from 'envalid';

const config = cleanEnv(process.env, {
  BOT_TOKEN: str(),
  CLIENT_ID: str(),
  GUILD_ID: str(),
  GITHUB_PAT: str(),
  OWNER: str(),
  REPO: str(),
  BRANCH: str(),
});

export default config;
