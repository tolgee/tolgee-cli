// @ts-nocheck

import React from 'react';
import { T } from '@tolgee/react';

export default function App() {
  return (
    <main>
      <h1>
        <T keyName="welcome" ns="greet" />
      </h1>
      <section>
        <h2>
          <T keyName="section-title" />
        </h2>
        <h2>
          <T keyName="section-content" />
        </h2>
      </section>
      <footer>
        <div>
          <T keyName="copyright-notice" ns="boring" />
        </div>
        <div>
          <T keyName="terms-of-service" ns="boring" />
        </div>
        <div>
          <T keyName="privacy-policy" ns="boring" />
        </div>
      </footer>
    </main>
  );
}
