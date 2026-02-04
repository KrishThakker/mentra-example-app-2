import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import path from 'path';
import express from 'express';

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');

class ExampleMentraOSApp extends AppServer {
  
  // Keep track of active sessions
  private myActiveSessions: Map<string, AppSession> = new Map();

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      publicDir: path.join(__dirname, 'public'), // Serve files from src/public (or dist/public after build)
    });

    // Add custom routes
    const expressApp = this.getExpressApp();
    
    // Parse JSON bodies (though we aren't sending JSON in this simple example, it's good practice)
    expressApp.use(express.json());

    expressApp.post('/trigger', (req, res) => {
      console.log('Triggering display on', this.myActiveSessions.size, 'sessions');
      
      let count = 0;
      this.myActiveSessions.forEach((session) => {
        session.layouts.showTextWall("hello there", {
            durationMs: 5000,
            view: ViewType.MAIN
        });
        count++;
      });
      
      res.json({ success: true, count });
    });
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> { // Removed protected as it might conflict if not handled correctly, but keeping it as per original
    console.log(`New session: ${sessionId} for user ${userId}`);
    this.myActiveSessions.set(sessionId, session);

    // Show welcome message
    session.layouts.showTextWall("Button App Ready! Open Webview to trigger.", {
        durationMs: 3000
    });

    // Handle real-time transcription (kept from original)
    session.events.onTranscription((data) => {
      if (data.isFinal) {
        session.layouts.showTextWall("You said: " + data.text, {
          view: ViewType.MAIN,
          durationMs: 3000
        });
      }
    });

    session.events.onGlassesBattery((data) => {
      console.log('Glasses battery:', data);
    });
  }

  // Handle session cleanup
  protected async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
      console.log(`Session stopped: ${sessionId} (${reason})`);
      this.myActiveSessions.delete(sessionId);
  }
}

// Start the server
// DEV CONSOLE URL: https://console.mentra.glass/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleMentraOSApp();

app.start().catch(console.error);