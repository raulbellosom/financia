import { Client, Account, Databases, Storage, Functions } from 'appwrite';
import { APPWRITE_CONFIG } from './constants';

const client = new Client();

client
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export default client;
