export function tolgeeDataToDict(data: any) {
  return Object.fromEntries(
    data._embedded.keys.map((k: any) => [
      k.keyName,
      {
        __ns: k.keyNamespace,
        ...Object.fromEntries(
          Object.entries(k.translations).map(([locale, data]: any) => [
            locale,
            data.text,
          ])
        ),
      },
    ])
  );
}
