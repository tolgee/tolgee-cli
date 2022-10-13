import readline from 'readline'; // readline/promises is Node 17, currently supporting Node 16+

export async function askString(question: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question} `, (a) => {
      resolve(a);
      rl.close();
    });
  });
}

export async function askBoolean(
  question: string,
  def: boolean = false
): Promise<boolean> {
  const yn = def === true ? '[Y/n]' : '[y/N]';
  let res = def;

  const str = await askString(`${question} ${yn}`);
  const strRes = str[0]?.toLowerCase();
  if (strRes === 'y') res = true;
  else if (strRes === 'n') res = false;

  return res;
}
