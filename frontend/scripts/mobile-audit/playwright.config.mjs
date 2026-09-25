import base from '../../playwright.config.mjs';
import {fileURLToPath} from 'node:url';
const frontendRoot=fileURLToPath(new URL('../../',import.meta.url));
export default {
  ...base,
  testDir:'.',
  outputDir:'../../gesture-audit-results',
  projects:base.projects.filter(project=>project.name==='mobile-390'),
  webServer:base.webServer.map(server=>({...server,cwd:server.cwd||frontendRoot})),
};
