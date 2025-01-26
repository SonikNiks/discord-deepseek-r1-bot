# 🤖 Discord Bot for Deepseek-R1 (Local and API run) 🐋

This is Discord Bot for Deepseek R1 with automically fallback to local fetching once the API usage is limited. 🐋

## Requirements

- Brain
- Docker
- Discordjs
- TypeScript
- Ollama (just use docker, why you so fall in love with direct binary execution)
  - You can also install by `flake.nix` with Nix
- Deepseek R1 API

## Local Serving for Deepseek-R1 (since you don't know) 🍽️

### Install Ollama

```sh
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
# or
git clone https://github.com/fzn0x/discord-deepseek-r1-bot
cd discord-deepseek-r1-bot
nix develop
```

### Run Deepseek R1 Model with Ollama

I'm using 1.5b, you can choose other models here: https://ollama.com/library/deepseek-r1:1.5b

```sh
docker exec -it ollama ollama run deepseek-r1:1.5b
```

### CURL your local API

```sh
curl http://localhost:11434/api/generate -d '{
  "model": "deepseek-r1:1.5b",
  "prompt": "Why is the sky blue?"
}'
```

**You can use this step on your VPS. If you want cheap servers, try something like Contabo (I'm not promoting them).**

Optional Task: There is a clean.py file if you accidentally run out of memory when running models with _vLLM_.

## Credits

- God
- Deepseek
- Me
- Internet
- Founder of electricity
- Github
- Your Mom
- etc

## License

This project licensed in [MIT License](./LICENSE)

## Pro Tips 💡

Adds a smart contract development, there you go another shitcoin project.
