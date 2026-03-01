'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Maximize2,
    Minimize2,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';

interface VideoPlayerProps {
    fileUrl: string;
    title: string;
}

export default function VideoPlayer({ fileUrl, title }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onLoadedMetadata = () => setDuration(video.duration || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);
        const onVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted || video.volume === 0);
        };

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('volumechange', onVolumeChange);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('volumechange', onVolumeChange);
        };
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.load();
    }, [fileUrl]);

    const togglePlay = async () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            await video.play().catch(() => {
                // Ignore autoplay restriction, user can click again.
            });
            return;
        }
        video.pause();
    };

    const handleSeek = (nextTime: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
    };

    const handleVolumeChange = (nextVolume: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = nextVolume;
        video.muted = nextVolume === 0;
        setVolume(nextVolume);
        setIsMuted(nextVolume === 0);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    const skip = (seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        const nextTime = Math.min(Math.max(0, video.currentTime + seconds), duration || 0);
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await playerRef.current?.requestFullscreen().catch(() => {
                // Ignore fullscreen failure.
            });
            return;
        }
        await document.exitFullscreen().catch(() => {
            // Ignore fullscreen failure.
        });
    };

    const formatTime = (time: number) => {
        const total = Math.max(0, Math.floor(time));
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div ref={playerRef} className="w-full h-full relative bg-black overflow-hidden">
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                preload="metadata"
                onDoubleClick={toggleFullscreen}
                onClick={togglePlay}
            >
                <source src={fileUrl} />
                Browser Anda tidak mendukung pemutaran video.
            </video>

            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                <p className="text-sm font-medium line-clamp-1">{title}</p>
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 space-y-3">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                />

                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => skip(-10)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Mundur 10 detik"
                        >
                            <SkipBack size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={togglePlay}
                            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => skip(10)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Maju 10 detik"
                        >
                            <SkipForward size={16} />
                        </button>
                        <span className="text-xs text-gray-200 min-w-[78px] text-center">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleMute}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(Number(e.target.value))}
                            className="w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
