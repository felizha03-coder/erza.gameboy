import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { erzaAudio } from '../../audio/erzaAudio';
import { PixelCloud, PixelSmiley, PixelStar } from '../../components/ErzaPixelArt';
import { ERZA_FRIEND_NOTE } from '../../data/erzaData';
import { ThemeMode } from '../../types/erza';

interface ErzaFriendNoteScreenProps {
  themeMode: ThemeMode;
  savedNote: boolean;
  onSaveNote: () => void;
  onBack: () => void;
  confirmTrigger: number;
}

export const ErzaFriendNoteScreen: React.FC<ErzaFriendNoteScreenProps> = ({
  themeMode,
  savedNote,
  onSaveNote,
  onBack,
  confirmTrigger,
}) => {
  const [opened, setOpened] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [justSavedBanner, setJustSavedBanner] = useState(false);

  const paperRef = useRef<HTMLDivElement | null>(null);
  const isNight = themeMode === 'NIGHT';
  const typingDone = typedCount >= ERZA_FRIEND_NOTE.length;

  useEffect(() => {
    if (confirmTrigger === 0) return;
    if (!opened) {
      handleOpenEnvelope();
    } else if (!typingDone) {
      setTypedCount(ERZA_FRIEND_NOTE.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmTrigger]);

  useEffect(() => {
    if (!opened || !paperRef.current) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      gsap.fromTo(
        paperRef.current,
        { y: 24, scaleY: 0.72, opacity: 0 },
        { y: 0, scaleY: 1, opacity: 1, duration: 0.48, ease: 'power3.out' }
      );
    }
  }, [opened]);

  useEffect(() => {
    if (!opened || typingDone) return;
    const timer = window.setInterval(() => {
      setTypedCount((prev) => {
        const next = prev + 4;
        if (next >= ERZA_FRIEND_NOTE.length) {
          window.clearInterval(timer);
          return ERZA_FRIEND_NOTE.length;
        }
        return next;
      });
    }, 24);
    return () => window.clearInterval(timer);
  }, [opened, typingDone]);

  const handleOpenEnvelope = () => {
    erzaAudio.playEnvelopeOpen();
    setOpened(true);
  };

  const handleSave = () => {
    erzaAudio.playConfirm();
    onSaveNote();
    setJustSavedBanner(true);
    window.setTimeout(() => setJustSavedBanner(false), 4000);
  };

  return (
    <div className="h-full flex flex-col p-3 relative overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
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
        <div className="flex items-center gap-1.5 min-w-0">
          <PixelStar size={14} color="#79BFFF" />
          <span
            className={`font-pixel text-[7.5px] sm:text-[8px] truncate ${
              isNight ? 'text-[#E7F5FF]' : 'text-[#142D49]'
            }`}
          >
            A NOTE FOR MY FRIEND
          </span>
        </div>
      </div>

      {!opened ? (
        /* Light-blue Retro Envelope */
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <PixelCloud
            size={28}
            color="#F8FCFF"
            className="absolute top-2 left-3 animate-float-gentle"
          />
          <PixelStar
            size={18}
            color="#79BFFF"
            className="absolute top-4 right-5 animate-float-gentle"
          />
          <PixelSmiley
            size={18}
            className="absolute bottom-4 left-6 animate-float-gentle"
          />
          <PixelStar
            size={15}
            color="#A8D8FF"
            className="absolute bottom-5 right-7 animate-float-gentle"
          />

          <button
            type="button"
            onClick={handleOpenEnvelope}
            className="group relative w-full max-w-[285px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#79BFFF] rounded-2xl transition-transform hover:scale-[1.03] active:scale-95"
          >
            <div className="relative rounded-2xl bg-gradient-to-b from-[#E7F5FF] to-[#A8D8FF] border-2 border-[#142D49] p-5 shadow-[0_7px_0_#142D49]">
              <div
                aria-hidden="true"
                className="mx-auto w-0 h-0 border-l-[116px] border-l-transparent border-r-[116px] border-r-transparent border-t-[46px] border-t-[#79BFFF]/85 -mt-5 mb-2"
              />
              {/* Friendship Sticker Seal */}
              <div className="mx-auto -mt-8 mb-3 w-11 h-11 rounded-xl bg-[#347BB8] border-2 border-[#F8FCFF] shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                <PixelSmiley size={22} color="#FDE047" />
              </div>

              <p className="font-pixel text-[9px] leading-relaxed text-[#142D49] text-center">
                &ldquo;A LITTLE NOTE FOR YOU, ERZA&rdquo;
              </p>

              <div className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-[#142D49] text-[#F8FCFF] font-silk text-[9px]">
                CLICK / PRESS A TO OPEN
              </div>
            </div>
          </button>
        </div>
      ) : (
        /* Unfolding Paper + Typewriter Friendship Note */
        <div ref={paperRef} className="flex-1 min-h-0 flex flex-col origin-top">
          <div
            onClick={() => {
              if (!typingDone) setTypedCount(ERZA_FRIEND_NOTE.length);
            }}
            className="flex-1 min-h-0 overflow-y-auto lcd-scroll note-paper rounded-xl border-2 border-[#347BB8] p-3 shadow-[inset_0_2px_8px_rgba(20,45,73,0.12)] text-[#142D49] relative cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5 border-b border-[#347BB8]/25 pb-1">
              <div className="flex items-center gap-1.5">
                <PixelCloud size={18} color="#A8D8FF" />
                <span className="font-pixel text-[8px] text-[#347BB8]">
                  A NOTE FOR MY FRIEND
                </span>
              </div>
              <div className="flex items-center gap-1">
                <PixelSmiley size={14} color="#79BFFF" />
                {!typingDone && (
                  <span className="font-silk text-[8px] text-[#347BB8]">
                    TAP TO SKIP
                  </span>
                )}
              </div>
            </div>

            <div className="whitespace-pre-line font-vt text-[17px] sm:text-[18px] leading-[1.28] text-[#142D49]">
              {ERZA_FRIEND_NOTE.slice(0, typedCount)}
              {!typingDone && (
                <span className="inline-block w-2 h-4 bg-[#347BB8] ml-0.5 align-middle" />
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 px-3 rounded-xl bg-[#347BB8] hover:brightness-110 border-2 border-[#F8FCFF] text-[#F8FCFF] font-pixel text-[8px] shadow-[0_3px_0_#142D49] active:translate-y-0.5 cursor-pointer transition-all"
            >
              {savedNote ? '✓ NOTE SAVED' : '[ SAVE NOTE ]'}
            </button>
          </div>
        </div>
      )}

      {/* Save Confirmation Banner */}
      {justSavedBanner && (
        <div className="absolute bottom-12 left-3 right-3 rounded-xl bg-[#142D49] border-2 border-[#79BFFF] px-3 py-2 text-center shadow-xl z-20">
          <div className="font-pixel text-[8px] text-[#F8FCFF]">
            NOTE SAVED SUCCESSFULLY!
          </div>
          <p className="mt-1 font-vt text-[15px] text-[#A8D8FF] leading-tight">
            ONE MORE MEMORY ADDED TO YOUR COLLECTION.
          </p>
        </div>
      )}
    </div>
  );
};
