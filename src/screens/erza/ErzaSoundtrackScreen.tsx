import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Upload,
  Volume2,
} from 'lucide-react';
import { erzaAudio } from '../../audio/erzaAudio';
import { PixelCloud, PixelMusicIcon, PixelStar } from '../../components/ErzaPixelArt';
import { ERZA_INITIAL_SOUNDTRACK } from '../../data/erzaData';
import { DirectionInput, SoundtrackItem, ThemeMode } from '../../types/erza';

interface ErzaSoundtrackScreenProps {
  themeMode: ThemeMode;
  onBack: () => void;
  navSignal: { dir: DirectionInput; tick: number } | null;
  confirmTrigger: number;
}

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export const ErzaSoundtrackScreen: React.FC<ErzaSoundtrackScreenProps> = ({
  themeMode,
  onBack,
  navSignal,
  confirmTrigger,
}) => {
  const [tracks, setTracks] = useState<SoundtrackItem[]>(() => ERZA_INITIAL_SOUNDTRACK);
  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(() => erzaAudio.getVolume());
  const [bars, setBars] = useState<number[]>(() => Array(14).fill(14));
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(ERZA_INITIAL_SOUNDTRACK.map((t) => [t.audioSrc, t.durationSec]))
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tracksRef = useRef(tracks);
  const trackIdxRef = useRef(trackIdx);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);

  tracksRef.current = tracks;
  trackIdxRef.current = trackIdx;
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;

  const isNight = themeMode === 'NIGHT';
  const currentTrack = tracks[trackIdx] ?? tracks[0];
  const currentDuration = durations[currentTrack.audioSrc] ?? currentTrack.durationSec;

  const advanceNextTrack = useCallback((keepPlaying: boolean) => {
    const list = tracksRef.current;
    const curr = trackIdxRef.current;
    let next = (curr + 1) % list.length;
    if (shuffleRef.current && list.length > 1) {
      let rand = Math.floor(Math.random() * list.length);
      if (rand === curr) rand = (curr + 1) % list.length;
      next = rand;
    }
    setTrackIdx(next);
    setElapsed(0);
    setIsPlaying(keepPlaying);
    if (keepPlaying) {
      void erzaAudio.loadAndPlayAudio(list[next].audioSrc, 0);
    } else {
      erzaAudio.stopAudio();
      erzaAudio.preloadTrackMetadata(list[next].audioSrc);
    }
  }, []);

  useEffect(() => {
    erzaAudio.setAudioCallbacks({
      onEnded: () => {
        if (repeatRef.current) {
          const track = tracksRef.current[trackIdxRef.current];
          setElapsed(0);
          void erzaAudio.loadAndPlayAudio(track.audioSrc, 0);
        } else if (tracksRef.current.length > 1) {
          advanceNextTrack(true);
        } else {
          setIsPlaying(false);
          setElapsed(0);
        }
      },
      onLoadedMetadata: (src, durationSec) => {
        setDurations((prev) => ({
          ...prev,
          [src]: durationSec,
        }));
      },
    });

    erzaAudio.preloadTrackMetadata(ERZA_INITIAL_SOUNDTRACK[0].audioSrc);

    return () => {
      erzaAudio.setAudioCallbacks({});
      erzaAudio.stopAudio();
    };
  }, [advanceNextTrack]);

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(14).fill(14));
      return;
    }

    const timer = window.setInterval(() => {
      const state = erzaAudio.getAudioState();
      setElapsed(state.currentTime);
      if (state.duration > 0 && state.src) {
        setDurations((prev) =>
          Math.abs((prev[state.src!] ?? 0) - state.duration) > 0.5
            ? { ...prev, [state.src!]: state.duration }
            : prev
        );
      }
      setBars(erzaAudio.getVisualizerBars(14));
    }, 120);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    erzaAudio.playClick();
    setIsPlaying((prev) => {
      const next = !prev;
      const track = tracksRef.current[trackIdxRef.current];
      if (next) {
        const audioState = erzaAudio.getAudioState();
        const resumeAt = audioState.src === track.audioSrc ? audioState.currentTime : 0;
        void erzaAudio.loadAndPlayAudio(track.audioSrc, resumeAt);
      } else {
        erzaAudio.pauseAudio();
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    erzaAudio.playClick();
    if (tracksRef.current.length === 1) {
      erzaAudio.seekAudio(0);
      setElapsed(0);
      if (isPlaying) void erzaAudio.loadAndPlayAudio(tracksRef.current[0].audioSrc, 0);
      return;
    }
    advanceNextTrack(isPlaying);
  }, [advanceNextTrack, isPlaying]);

  const handlePrev = useCallback(() => {
    erzaAudio.playClick();
    const audioState = erzaAudio.getAudioState();
    if (audioState.currentTime > 3 || tracksRef.current.length === 1) {
      erzaAudio.seekAudio(0);
      setElapsed(0);
      return;
    }
    const prevIdx =
      (trackIdxRef.current - 1 + tracksRef.current.length) % tracksRef.current.length;
    const prevTrack = tracksRef.current[prevIdx];
    setTrackIdx(prevIdx);
    setElapsed(0);
    if (isPlaying) {
      void erzaAudio.loadAndPlayAudio(prevTrack.audioSrc, 0);
    } else {
      erzaAudio.stopAudio();
      erzaAudio.preloadTrackMetadata(prevTrack.audioSrc);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!navSignal) return;
    if (navSignal.dir === 'RIGHT') handleNext();
    else if (navSignal.dir === 'LEFT') handlePrev();
  }, [navSignal, handleNext, handlePrev]);

  useEffect(() => {
    if (confirmTrigger === 0) return;
    togglePlay();
  }, [confirmTrigger, togglePlay]);

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * currentDuration;
    setElapsed(targetSec);
    erzaAudio.seekAudio(targetSec);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    erzaAudio.setVolume(val);
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
    const customTrack: SoundtrackItem = {
      id: `upload-${Date.now()}`,
      title: cleanTitle,
      artist: 'CUSTOM CASSETTE',
      durationSec: 180,
      audioSrc: objectUrl,
      coverAccent: '#23598a',
      caption: 'Your uploaded soundtrack on Erza’s Game Boy.',
      personalNote: ERZA_INITIAL_SOUNDTRACK[0].personalNote,
      spotifyUrl: ERZA_INITIAL_SOUNDTRACK[0].spotifyUrl,
      youtubeUrl: ERZA_INITIAL_SOUNDTRACK[0].youtubeUrl,
      isUserUpload: true,
    };
    setTracks((prev) => {
      const next = [...prev, customTrack];
      setTrackIdx(next.length - 1);
      return next;
    });
    setElapsed(0);
    setIsPlaying(true);
    void erzaAudio.loadAndPlayAudio(objectUrl, 0);
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-3 overflow-y-auto lcd-scroll select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className={`px-2 py-1 rounded-md font-pixel text-[7.5px] border cursor-pointer shrink-0 ${
            isNight
              ? 'bg-[#0b1b2e]/85 border-[#79BFFF]/55 text-[#E7F5FF] hover:bg-[#347BB8]'
              : 'bg-[#F8FCFF] border-[#347BB8]/65 text-[#142D49] hover:bg-[#E7F5FF]'
          }`}
        >
          ◀ MENU
        </button>
        <span
          className={`font-pixel text-[8px] truncate ${
            isNight ? 'text-[#E7F5FF]' : 'text-[#142D49]'
          }`}
        >
          OUR SOUNDTRACK
        </span>
      </div>

      {/* Blue Cassette-Inspired Player */}
      <div className="rounded-xl bg-[#142D49] border-2 border-[#79BFFF] p-2.5 text-[#F8FCFF] shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Pixel Album Art & Spinning Reels */}
          <div
            className="w-16 h-16 rounded-lg border-2 border-[#E7F5FF]/80 flex flex-col items-center justify-center relative shrink-0 overflow-hidden"
            style={{ backgroundColor: currentTrack.coverAccent }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className={`w-4 h-4 rounded-full border-2 border-[#F8FCFF] bg-[#142D49] flex items-center justify-center ${
                  isPlaying ? 'animate-spin-reel' : ''
                }`}
              >
                <div className="w-1 h-1 bg-[#79BFFF] rounded-full" />
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 border-[#F8FCFF] bg-[#142D49] flex items-center justify-center ${
                  isPlaying ? 'animate-spin-reel' : ''
                }`}
              >
                <div className="w-1 h-1 bg-[#79BFFF] rounded-full" />
              </div>
            </div>
            <PixelMusicIcon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-pixel text-[8.5px] text-[#F8FCFF] truncate">
                {currentTrack.title}
              </span>
              <span className="font-silk text-[7.5px] text-[#A8D8FF] shrink-0">
                CASSETTE
              </span>
            </div>
            <p className="font-pixel text-[7.5px] text-[#79BFFF] mt-0.5 truncate">
              {currentTrack.artist}
            </p>
            <p className="font-vt text-[14px] text-[#E7F5FF] leading-tight truncate mt-0.5">
              {currentTrack.caption}
            </p>

            {/* Blue Visualizer Bars */}
            <div className="mt-1 h-4 flex items-end gap-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-[#347BB8] via-[#79BFFF] to-[#F8FCFF] transition-all duration-100"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Glowing Progress Indicator */}
        <div className="mt-2">
          <div
            onClick={handleScrub}
            role="slider"
            aria-label="Song progress"
            aria-valuemin={0}
            aria-valuemax={Math.floor(currentDuration)}
            aria-valuenow={Math.floor(elapsed)}
            tabIndex={0}
            className="w-full h-2.5 rounded-full bg-[#0b1b2e] cursor-pointer overflow-hidden border border-[#79BFFF]/60"
          >
            <div
              className="h-full bg-gradient-to-r from-[#347BB8] via-[#79BFFF] to-[#F8FCFF] shadow-[0_0_8px_#79BFFF] transition-all duration-150"
              style={{
                width: `${
                  currentDuration > 0
                    ? Math.min(100, (elapsed / currentDuration) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="mt-0.5 flex items-center justify-between font-silk text-[8.5px] text-[#A8D8FF] tabular-nums">
            <span>{formatSec(elapsed)}</span>
            <div className="flex items-center gap-2">
              <a
                href={currentTrack.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[#F8FCFF] hover:text-[#79BFFF] underline"
              >
                Spotify <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a
                href={currentTrack.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[#F8FCFF] hover:text-[#79BFFF] underline"
              >
                YouTube <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <span>{formatSec(currentDuration)}</span>
          </div>
        </div>

        {/* Pixel-Style Playback Controls + Volume */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                erzaAudio.playClick();
                setShuffle((s) => !s);
              }}
              aria-label="Shuffle"
              className={`p-1.5 rounded-lg border cursor-pointer ${
                shuffle
                  ? 'bg-[#347BB8] border-[#F8FCFF] text-[#F8FCFF]'
                  : 'bg-[#0b1b2e] border-[#79BFFF]/45 text-[#A8D8FF]'
              }`}
            >
              <Shuffle className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous"
              className="p-1.5 rounded-lg bg-[#0b1b2e] border border-[#79BFFF]/55 text-[#E7F5FF] hover:bg-[#347BB8] cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="px-2.5 py-1.5 rounded-lg bg-[#347BB8] border border-[#F8FCFF] text-[#F8FCFF] hover:brightness-110 cursor-pointer flex items-center gap-1"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next"
              className="p-1.5 rounded-lg bg-[#0b1b2e] border border-[#79BFFF]/55 text-[#E7F5FF] hover:bg-[#347BB8] cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                erzaAudio.playClick();
                setRepeat((r) => !r);
              }}
              aria-label="Repeat"
              className={`p-1.5 rounded-lg border cursor-pointer ${
                repeat
                  ? 'bg-[#347BB8] border-[#F8FCFF] text-[#F8FCFF]'
                  : 'bg-[#0b1b2e] border-[#79BFFF]/45 text-[#A8D8FF]'
              }`}
            >
              <Repeat className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 w-24">
            <Volume2 className="w-3.5 h-3.5 text-[#A8D8FF] shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label="Volume"
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-[#79BFFF] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Personal Message Box */}
      <div
        className={`mt-2 rounded-xl border-2 p-2.5 shrink-0 ${
          isNight
            ? 'bg-[#142D49]/90 border-[#79BFFF]/45 text-[#E7F5FF]'
            : 'bg-[#F8FCFF]/95 border-[#347BB8]/55 text-[#142D49]'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <PixelCloud size={15} color="#79BFFF" />
          <PixelStar size={12} color="#347BB8" />
          <span className="font-pixel text-[6.5px] text-[#347BB8]">
            LINER NOTES
          </span>
        </div>
        <p className="font-vt text-[15.5px] leading-tight">
          &ldquo;{currentTrack.personalNote}&rdquo;
        </p>
      </div>

      {/* Audio Upload & Cassette Queue */}
      <div className="mt-2 flex items-center justify-between gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleUploadAudio}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-pixel text-[6.5px] cursor-pointer ${
            isNight
              ? 'bg-[#0b1b2e]/90 border-[#79BFFF]/60 text-[#E7F5FF] hover:bg-[#347BB8]'
              : 'bg-[#E7F5FF] border-[#347BB8] text-[#142D49] hover:bg-[#C5E5FF]'
          }`}
        >
          <Upload className="w-3 h-3" />
          <span>UPLOAD OWN AUDIO</span>
        </button>

        {tracks.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {tracks.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTrackIdx(i);
                  setElapsed(0);
                  setIsPlaying(true);
                  void erzaAudio.loadAndPlayAudio(t.audioSrc, 0);
                }}
                className={`px-2 py-1 rounded font-silk text-[8px] border cursor-pointer ${
                  i === trackIdx
                    ? 'bg-[#347BB8] text-[#F8FCFF] border-[#F8FCFF]'
                    : 'bg-[#E7F5FF] text-[#142D49] border-[#79BFFF]'
                }`}
              >
                T{i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
