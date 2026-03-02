// Library imports
import { ElevenLabsClient,
  play } from '@elevenlabs/elevenlabs-js'; // npm install @elevenlabs/elevenlabs-js
import 'dotenv/config';                           // npm install dotenv

const elevenlabs = new ElevenLabsClient();


const voiceId    = 'JBFqnCBsd6RMkjVDRZzb';
//const modelId    = 'eleven_turbo_v2_5'; // 'eleven_multilingual_sts_v2'
const modelId    = 'eleven_multilingual_sts_v2';

const audio      = await elevenlabs.textToSpeech.convert(voiceId, {
    text        : 'The first move is what sets everything in motion.',
    modelId     : modelId,
    outputFormat: 'mp3_44100_128',
});

await play(audio);

