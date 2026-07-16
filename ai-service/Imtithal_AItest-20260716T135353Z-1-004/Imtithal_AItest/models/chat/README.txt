Place the developer-trained CHAT / CausalLM checkpoint in this folder.

Expected files (HuggingFace layout), for example:
  config.json
  tokenizer.json / tokenizer_config.json
  model.safetensors  (or pytorch_model.bin / *.gguf)

This directory is for conversational generation ONLY.
Do NOT put AraBERT BertForSequenceClassification weights here
(those stay in ../classifier/).

Override path with env: IMTITHAL_CHAT_MODEL_DIR=<absolute path>
