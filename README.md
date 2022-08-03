# Tolgee CLI (experimental)

- Pull requests welcomed! 🤩

Supported operations:
 - Import ⬇️


### How to run

It's not published as executable package yet, so you have to run it via npm and node manually.

1. `npm install`

### Import local data to Tolgee platform

`npm run run-dev -- import --input "<pathToDirToImport>" --apiKey <your apiKey>`

### Extract keys from your source
```
npm run run-dev -- extract --input <glob pattern to match files> print
```

example:

```
npm run run-dev -- extract --input "./src/**/*.ts?" compare
```


### Compare keys in your source to data in Tolgee platfrorm 
```
npm run run-dev -- extract --input <glob pattern to match files> --apiKey <your api key> compare
```

example: 

```
npm run run-dev -- extract --input "./src/**/*.ts?" --apiKey aldsk987239487afdsdsaj compare
```
