import React, { useState } from "react";
import { useMediaVideos } from "@/hooks/use-media";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, X, ChevronRight, ChevronLeft, Film, Music, Mic2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { Link } from "wouter";

const CATEGORIES = [
  { id: 'trailer', label: 'مقاطع دعائية', icon: Film },
  { id: 'song', label: 'أغاني أصلية', icon: Music },
  { id: 'universe', label: 'قصص الكون', icon: Star },
  { id: 'announcement', label: 'إعلانات', icon: Mic2 }
];

export default function MediaHub() {
  const { data: allVideos, isLoading } = useMediaVideos();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const featuredVideo = allVideos?.find(v => v.isFeatured) || allVideos?.[0];
  
  const getVideosByCategory = (category: string) => {
    return allVideos?.filter(v => v.category === category) || [];
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">جارٍ تحميل الكون...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black">
      <SEO title="مركز الوسائط | الكون السينمائي" description="استكشف المقاطع الدعائية، الأغاني، والمحتوى السينمائي من كون حكاياتي." />
      <Navbar />

      <main className="pb-20">
        {/* Cinematic Hero Section */}
        {featuredVideo ? (
          <section className="relative h-[85vh] w-full overflow-hidden">
            {/* Background Video/Image */}
            <div className="absolute inset-0 z-0">
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
               <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent z-10" />
               <img 
                 src={featuredVideo.thumbnailUrl} 
                 className="w-full h-full object-cover opacity-60 scale-105"
                 alt="Featured"
               />
               <iframe
                 className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none scale-110"
                 src={`https://www.youtube.com/embed/${featuredVideo.youtubeVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${featuredVideo.youtubeVideoId}&rel=0&showinfo=0`}
                 allow="autoplay; encrypted-media"
                 referrerPolicy="strict-origin-when-cross-origin"
               />
            </div>

            {/* Hero Content */}
            <div className="relative z-20 h-full flex flex-col justify-end px-6 md:px-16 pb-24 max-w-4xl space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4 flex-wrap">
                   <span className="px-2 sm:px-3 py-1 bg-primary text-black text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded">محتوى مميز</span>
                   <span className="text-white/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest">{featuredVideo.category}</span>
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif font-black text-white mb-2 sm:mb-4 leading-tight drop-shadow-2xl">
                  {featuredVideo.title}
                </h1>
                <p className="text-sm sm:text-lg text-white/70 max-w-2xl line-clamp-3 mb-6 sm:mb-8 font-medium">
                  {featuredVideo.description}
                </p>

                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setSelectedVideo(featuredVideo)}
                    className="h-14 px-10 rounded-xl bg-white text-black hover:bg-white/90 font-black text-lg gap-3 transition-transform hover:scale-105"
                  >
                    <Play size={24} fill="black" />
                    شاهد الآن
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        ) : (
          <section className="h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20">
             <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <Film className="w-10 h-10 text-primary animate-pulse" />
             </div>
             <h2 className="text-4xl font-serif font-black mb-4">الكون السينمائي يتسع</h2>
             <p className="text-white/50 max-w-md mx-auto">
                نحن نقوم حالياً بتحضير أحدث المقاطع الدعائية والأغاني الأصلية لكون حكاياتي. عد قريباً!
             </p>
             {/* Admin Shortcut */}
             <Link href="/admin?tab=media">
               <Button variant="link" className="mt-8 text-primary/50 hover:text-primary">
                 المسؤول: أضف محتوى لمركز الوسائط
               </Button>
             </Link>
          </section>
        )}

        {/* Content Rows */}
        <div className={cn("px-6 md:px-16 relative z-30 space-y-16", featuredVideo && "-mt-32")}>
          {allVideos?.length === 0 ? null : CATEGORIES.map((cat) => {
            const videos = getVideosByCategory(cat.id);
            if (videos.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <cat.icon className="w-6 h-6 text-primary" />
                      <h2 className="text-2xl font-serif font-black tracking-tight">{cat.label}</h2>
                   </div>
                   <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent mx-8 hidden md:block" />
                </div>

                <div className="flex gap-4 overflow-x-auto pb-8 pt-2 no-scrollbar snap-x">
                   {videos.map((video) => (
                     <VideoCard 
                        key={video.id} 
                        video={video} 
                        onClick={() => setSelectedVideo(video)}
                     />
                   ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal 
            video={selectedVideo} 
            onClose={() => setSelectedVideo(null)} 
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

function VideoCard({ video, onClick }: { video: any, onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-[280px] md:w-[320px] aspect-video rounded-2xl overflow-hidden cursor-pointer group snap-start border border-white/5 bg-white/5"
    >
      <img 
        src={video.thumbnailUrl} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
        alt={video.title}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
      
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-50 group-hover:scale-100">
         <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl shadow-primary/20">
            <Play size={32} fill="black" className="ml-1 text-black" />
         </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
        <p className="text-sm font-bold text-white truncate drop-shadow-md">
          {video.title}
        </p>
        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          شاهد الآن
        </p>
      </div>
    </motion.div>
  );
}

function VideoModal({ video, onClose }: { video: any, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/95 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-6xl aspect-video rounded-3xl overflow-hidden bg-black shadow-[0_0_100px_rgba(255,184,0,0.15)] border border-white/10"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all"
        >
          <X size={24} />
        </button>

        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />

        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                 <span className="text-primary text-xs font-black uppercase tracking-widest">{video.category}</span>
                 <h2 className="text-3xl font-serif font-black text-white">{video.title}</h2>
                 <p className="text-white/60 text-sm max-w-2xl line-clamp-2">{video.description}</p>
              </div>
              
              {video.relatedStoryId && (
                <Link href={`/product/${video.relatedStoryId}`}>
                  <Button className="bg-primary text-black font-black uppercase tracking-tighter gap-2 px-6 h-12 rounded-xl hover:scale-105 transition-all">
                    اكتشف القصة
                    <ChevronRight size={18} />
                  </Button>
                </Link>
              )}
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
