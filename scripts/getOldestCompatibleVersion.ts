import axios from 'axios';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execCallback);

async function main() {
  const tagsResponse = await axios.get(
    'https://hub.docker.com/v2/namespaces/tolgee/repositories/tolgee/tags?page_size=100&sortby=last_updated'
  );

  const tags: string[] = tagsResponse.data.results
    .map((i: any) => i.name)
    .filter((t: string) => t.startsWith('v'));

  for (const tag of tags) {
    const promise = exec(`docker pull tolgee/tolgee:${tag}`);
    promise.child.stdout?.on('data', (data) => {
      console.log(data);
    });
    await promise;
  }
}

main();
