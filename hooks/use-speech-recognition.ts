"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRecognition,
  isSpeechRecognitionSupported,
} from "@/lib/audio/browser-stt";

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isSpeechRecognitionSupported());
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "aborted" and "no-speech" are not real errors
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("[STT] Recognition error:", event.error);
      }
      setListening(false);
    };

    recognition.start();
    setListening(true);
  }, [supported]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
  }, []);

  return { transcript, listening, supported, start, stop, reset };
}
