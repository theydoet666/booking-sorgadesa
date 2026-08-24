"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

// --- FlipCard Component ---
const IMG_WIDTH = 60;  // Reduced from 100
const IMG_HEIGHT = 85; // Reduced from 140

function FlipCard({
    src,
    index,
    total,
    phase,
    target,
}: FlipCardProps) {
    return (
        <motion.div
            // Smoothly animate to the coordinates defined by the parent
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
            }}

            // Initial style
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d", // Essential for the 3D hover effect
                perspective: "1000px",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-court-green/20 border border-rattan-gold/20"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img
                        src={src}
                        alt={`hero-${index}`}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-transparent" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-net-charcoal flex flex-col items-center justify-center p-2 border border-rattan-gold/40"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className="text-center">
                        <p className="text-[7px] font-bold text-smash-lime uppercase tracking-widest mb-0.5">SORGA</p>
                        <p className="text-[9px] font-bold text-shuttle-cream">BELEGA</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Main Hero Component ---
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000; // Virtual scroll range

// Unsplash Sports/Badminton/Fitness Images
const IMAGES = [
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&q=80", // Racket & shuttlecock
    "https://images.unsplash.com/photo-1554068865-24bccd4e34b8?w=300&q=80", // Court lines
    "https://images.unsplash.com/photo-1613918431208-67520e52706d?w=300&q=80", // Shuttlecocks
    "https://images.unsplash.com/photo-1521537634199-67368c740cc3?w=300&q=80", // Court net
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&q=80", // Sports gear
    "https://images.unsplash.com/photo-1600250395178-40da752e558e?w=300&q=80", // Gym court
    "https://images.unsplash.com/photo-1502224562085-639556652f33?w=300&q=80", // Running athlete
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=300&q=80", // Athletics
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300&q=80", // Running track
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&q=80", // Sports action
    "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=300&q=80", // Swimming/athlete
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&q=80", // Fitness
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&q=80", // Indoor stadium
    "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=300&q=80", // Sports court
    "https://images.unsplash.com/photo-1517438984742-1262db08379e?w=300&q=80", // Indoor game
    "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=300&q=80", // Sports stadium / court
    "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=300&q=80", // Sports training
    "https://images.unsplash.com/photo-1565992441121-4367c2967103?w=300&q=80", // Table tennis / sports
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=300&q=80", // Sports runner
    "https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=300&q=80"  // Court sports action
];

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

interface IntroAnimationProps {
    onOpenBooking: (courtId?: string, time?: string) => void;
    galleryImages?: Array<{ id_foto: any; url_foto: string; judul: string; status?: string }>;
    settings?: any;
}

export default function IntroAnimation({ onOpenBooking, galleryImages = [], settings = {} }: IntroAnimationProps) {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Container Size ---
    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };

        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);

        // Initial set
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });

        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0); // Keep track of scroll value without re-renders

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Prevent default to stop browser overscroll/bounce
            e.preventDefault();

            const newScroll = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Touch support
        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            touchStartY = touchY;

            const newScroll = Math.min(Math.max(scrollRef.current + deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Attach listeners to container instead of window for portability
        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
        };
    }, [virtualScroll]);

    // 1. Morph Progress: 0 (Circle) -> 1 (Bottom Arc)
    // Happens between scroll 0 and 600
    const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

    // 2. Scroll Rotation (Shuffling): Starts after morph (e.g., > 600)
    // Rotates the bottom arc as user continues scrolling
    const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

    // --- Mouse Parallax ---
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;

            // Normalize -1 to 1
            const normalizedX = (relativeX / rect.width) * 2 - 1;
            // Move +/- 100px
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // --- Intro Sequence ---
    useEffect(() => {
        const timer1 = setTimeout(() => setIntroPhase("line"), 500);
        const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    // Resolved images for hero (using gallery images or unsplash fallback)
    const heroImages = useMemo(() => {
        const activeGallery = galleryImages.filter(img => img.status === 'Aktif');
        if (activeGallery && activeGallery.length > 0) {
            const urls = activeGallery.map(img => img.url_foto);
            const repeatedUrls: string[] = [];
            while (repeatedUrls.length < TOTAL_IMAGES) {
                repeatedUrls.push(...urls);
            }
            return repeatedUrls.slice(0, TOTAL_IMAGES);
        }
        return IMAGES.slice(0, TOTAL_IMAGES);
    }, [galleryImages]);

    // --- Random Scatter Positions ---
    const scatterPositions = useMemo(() => {
        return Array.from({ length: TOTAL_IMAGES }).map(() => ({
            x: (Math.random() - 0.5) * 1500,
            y: (Math.random() - 0.5) * 1000,
            rotation: (Math.random() - 0.5) * 180,
            scale: 0.6,
            opacity: 0,
        }));
    }, []);

    // --- Render Loop (Manual Calculation for Morph) ---
    const [morphValue, setMorphValue] = useState(0);
    const [rotateValue, setRotateValue] = useState(0);
    const [parallaxValue, setParallaxValue] = useState(0);

    useEffect(() => {
        const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
        const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
        const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
        return () => {
            unsubscribeMorph();
            unsubscribeRotate();
            unsubscribeParallax();
        };
    }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

    // --- Content Opacity ---
    // Fade in content when arc is formed (morphValue > 0.8)
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-[550px] md:h-[700px] bg-transparent overflow-hidden rounded-3xl border border-chalk-line/10 shadow-2xl l-post-corner select-none">
            {/* Inner Container */}
            <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">

                {/* Intro Text (Fades out) */}
                <div className="absolute z-0 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2 px-4">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.5 - morphValue } : { opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="inline-block py-1 px-3.5 bg-court-green/40 border border-rattan-gold/30 text-rattan-gold rounded-full font-sans font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-4"
                    >
                        {settings.hero_badge || "Gianyar Bali Badminton Community"}
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        className="font-fraunces font-extrabold text-3xl sm:text-5xl text-net-charcoal leading-[1.1] tracking-tight max-w-2xl"
                    >
                        {settings.hero_title || "Main Badminton di Sorga Desa Belega"}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.8 - morphValue * 1.6 } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="mt-6 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-net-charcoal/60"
                    >
                        SCROLL / SWIPE UNTUK MENJELAJAHI
                    </motion.p>
                </div>

                {/* Arc Active Content (Fades in) */}
                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[12%] sm:top-[15%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-6"
                >
                    <span className="inline-block py-1 px-3 bg-court-green/30 border border-rattan-gold/20 text-rattan-gold rounded-full font-sans font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mb-3">
                        {settings.hero_sub_badge || "Kualitas Lapangan Kelas Dunia"}
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-fraunces font-extrabold text-net-charcoal tracking-tight mb-3 sm:mb-4">
                        {settings.hero_sub_title || "Main Seru & Nyaman"}
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-net-charcoal/70 max-w-xl leading-relaxed font-medium font-sans mb-6">
                        {settings.hero_desc || "Dapatkan pengalaman bermain badminton terbaik dengan lapangan standar BWF, lantai vinyl premium tebal, dan pencahayaan optimal di Gianyar. Cek jadwal dan booking langsung sekarang!"}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
                        <a 
                            href="#jadwal"
                            className="flex items-center justify-center py-2.5 px-6 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-court-green/95 active:scale-98 transition-all cursor-pointer border border-chalk-line/10"
                        >
                            Cek Jadwal Live
                        </a>
                        <button 
                            onClick={() => onOpenBooking()}
                            className="flex items-center justify-center py-2.5 px-6 bg-smash-lime text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-smash-lime/90 active:scale-98 transition-all cursor-pointer"
                        >
                            Pesan Sekarang
                        </button>
                    </div>
                </motion.div>

                {/* Main Container */}
                <div className="relative flex items-center justify-center w-full h-full">
                    {heroImages.map((src, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

                        // 1. Intro Phases (Scatter -> Line)
                        if (introPhase === "scatter") {
                            target = scatterPositions[i];
                        } else if (introPhase === "line") {
                            const lineSpacing = 70; // Adjusted for smaller images (60px width + 10px gap)
                            const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
                            const lineX = i * lineSpacing - lineTotalWidth / 2;
                            target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
                        } else {
                            // 2. Circle Phase & Morph Logic

                            // Responsive Calculations
                            const isMobile = containerSize.width < 768;
                            const minDimension = Math.min(containerSize.width, containerSize.height);

                            // A. Calculate Circle Position
                            const circleRadius = Math.min(minDimension * 0.35, 300);

                            const circleAngle = (i / TOTAL_IMAGES) * 360;
                            const circleRad = (circleAngle * Math.PI) / 180;
                            const circlePos = {
                                x: Math.cos(circleRad) * circleRadius,
                                y: Math.sin(circleRad) * circleRadius,
                                rotation: circleAngle + 90,
                            };

                            // B. Calculate Bottom Arc Position
                            // "Rainbow" Arch: Convex up. Center is highest point.

                            // Radius:
                            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
                            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);

                            // Position:
                            const arcApexY = containerSize.height * (isMobile ? 0.38 : 0.32);
                            const arcCenterY = arcApexY + arcRadius;

                            // Spread angle:
                            const spreadAngle = isMobile ? 100 : 130;
                            const startAngle = -90 - (spreadAngle / 2);
                            const step = spreadAngle / (TOTAL_IMAGES - 1);

                            // Apply Scroll Rotation (Shuffle) with Bounds
                            // We want to clamp rotation so images don't disappear.
                            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);

                            // Calculate bounded rotation:
                            const maxRotation = spreadAngle * 0.8; // Don't go all the way, keep last item visible
                            const boundedRotation = -scrollProgress * maxRotation;

                            const currentArcAngle = startAngle + (i * step) + boundedRotation;
                            const arcRad = (currentArcAngle * Math.PI) / 180;

                            const arcPos = {
                                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                                rotation: currentArcAngle + 90,
                                scale: isMobile ? 1.4 : 1.8, // Increased scale for active state
                            };

                            // C. Interpolate (Morph)
                            target = {
                                x: lerp(circlePos.x, arcPos.x, morphValue),
                                y: lerp(circlePos.y, arcPos.y, morphValue),
                                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                                scale: lerp(1, arcPos.scale, morphValue),
                                opacity: 1,
                            };
                        }

                        return (
                            <FlipCard
                                key={i}
                                src={src}
                                index={i}
                                total={TOTAL_IMAGES}
                                phase={introPhase} // Pass intro phase for initial animations
                                target={target}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
