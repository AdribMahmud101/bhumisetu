"""Generate Soniox Priya narration and mux it onto the checked 90-second film.

Run with the Soniox SDK installed and SONIOX_API_KEY in the environment.
Source takes live only in the repository's ignored .local/video/soniox directory.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from soniox import SonioxClient
from soniox.types import CreateTtsConfig


PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[1]
TAKES = REPO / ".local/video/soniox"
RENDERS = PROJECT / "renders"
TIMING = json.loads((PROJECT / "TIMING.json").read_text())
MUTED = RENDERS / "BhumiSetu_90s_Bangla_Muted.mp4"
NARRATION = RENDERS / "BhumiSetu_Priya_Bangla_Narration.wav"
VOICED = RENDERS / "BhumiSetu_90s_Bangla_Priya.mp4"


def duration(path: Path) -> float:
    value = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nokey=1:noprint_wrappers=1", str(path),
        ],
        text=True,
    )
    return float(value)


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    if not os.environ.get("SONIOX_API_KEY"):
        raise SystemExit("Set SONIOX_API_KEY in the environment before generating speech.")
    if not MUTED.exists() or abs(duration(MUTED) - 90) > 0.001:
        raise SystemExit("Expected the verified 90-second muted film first.")

    TAKES.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    client = SonioxClient()
    take_info = []
    input_args = []
    chains = []
    labels = []

    for index, scene in enumerate(TIMING["scenes"]):
        paced = index in (0, 1)
        name = f"line-{index + 1:02}{'-paced' if paced else ''}.wav"
        path = TAKES / name
        provider_speed = {0: 1.12, 1: 1.23}.get(index, 1.0)
        if not path.exists():
            config = (
                CreateTtsConfig(speed=provider_speed, reduce_silence=True)
                if paced else None
            )
            client.tts.generate_to_file(
                path, text=scene["text"], model="tts-rt-v2",
                language="bn", voice="Priya", audio_format="wav", config=config,
            )

        raw_duration = duration(path)
        budget = scene["voice_end"] - scene["voice_start"]
        # Only the overview needs a tiny pitch-preserving final adjustment.
        tempo = 1.045 if index == 1 else 1.0
        effective = raw_duration / tempo
        if effective > budget - 0.08:
            raise SystemExit(
                f"Scene {index + 1} is {effective:.3f}s and does not fit its "
                f"{budget:.3f}s voice window. Regenerate or edit the line."
            )
        start_ms = round(scene["voice_start"] * 1000)
        fade_start = max(0.0, effective - 0.065)
        parts = [f"[{index}:a]aresample=48000"]
        if tempo != 1.0:
            parts.append(f"atempo={tempo}")
        parts += [
            f"afade=t=out:st={fade_start:.3f}:d=0.065",
            f"adelay={start_ms}:all=1[a{index}]",
        ]
        chains.append(",".join(parts))
        labels.append(f"[a{index}]")
        input_args += ["-i", str(path)]
        take_info.append({
            "scene": index + 1, "start": scene["voice_start"],
            "end": round(scene["voice_start"] + effective, 3),
            "window_end": scene["voice_end"],
            "provider_speed": provider_speed, "finishing_tempo": tempo,
            "source_duration": round(raw_duration, 3),
            "placed_duration": round(effective, 3),
        })

    for before, after in zip(take_info, take_info[1:]):
        if before["end"] >= after["start"]:
            raise SystemExit("Narration scenes overlap.")

    chains.append(
        "".join(labels)
        + "amix=inputs=8:duration=longest:normalize=0,"
        "aresample=48000,apad,atrim=duration=90,"
        "loudnorm=I=-17:TP=-1.5:LRA=8[voice]"
    )
    filter_graph = ";".join(chains)
    run(
        "ffmpeg", "-v", "error", "-y", *input_args,
        "-filter_complex", filter_graph, "-map", "[voice]",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "1", str(NARRATION),
    )
    run(
        "ffmpeg", "-v", "error", "-y", "-i", str(MUTED), "-i", str(NARRATION),
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
        "-b:a", "192k", "-ar", "48000", "-ac", "1", "-t", "90",
        "-movflags", "+faststart", str(VOICED),
    )
    (PROJECT / "VOICE_TIMING.json").write_text(
        json.dumps({"voice": "Priya", "model": "tts-rt-v2", "language": "bn",
                    "audio_format": "wav", "scene_takes": take_info},
                   ensure_ascii=False, indent=2) + "\n"
    )
    print(f"Created {VOICED}")
    print(f"Narration ends at {take_info[-1]['end']:.3f}s; video ends at 90s.")


if __name__ == "__main__":
    main()
