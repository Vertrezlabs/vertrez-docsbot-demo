# Seed documents

Drop `.md` or `.txt` files in this folder, then run:

```bash
npm run seed
```

That will chunk + embed every file here and write `data/seed-embeddings.json`,
which the server loads automatically on startup so the bot has knowledge
without anyone needing to upload anything via the UI first.

This is useful when you want the bot to ship with a baseline body of
knowledge — for example, your own product docs — that survives server
restarts.

If you don't seed anything, the bot just starts empty: customers can still
upload documents via the sidebar, and those uploads live in memory for the
lifetime of the Node process.

> **Don't commit anything sensitive here.** Whatever you drop in this folder
> will end up in your git repo unless you `.gitignore` it.
