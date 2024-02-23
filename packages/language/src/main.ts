import { startLanguageServer, EmptyFileSystem } from 'langium';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { createEcchiServices } from './ecchi-module.js';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared } = createEcchiServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);
