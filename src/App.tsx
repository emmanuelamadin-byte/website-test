import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, X, Instagram, Mail, Phone, ArrowRight, CheckCircle,
  Edit, Trash2, Plus, Lock, LogOut, Video, Star, Quote,
  MessageCircle, Save, Image as ImageIcon, Upload,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// ─── Firebase ──────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const FIREBASE_READY = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
let _auth:    any = null;
let _db:      any = null;
let _storage: any = null;

if (FIREBASE_READY) {
  try {
    const _app = initializeApp(firebaseConfig);
    _auth    = getAuth(_app);
    _db      = getFirestore(_app);
    _storage = getStorage(_app);
  } catch (e) {
    console.warn('Firebase init failed — running in static mode.', e);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────
const ADMIN_PIN   = import.meta.env.VITE_ADMIN_PIN || '1234';
const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23EAE5DF' width='800' height='600'/%3E%3C/svg%3E`;

const getYouTubeId = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
};

const cleanPhone = (p: string) => p.replace(/[^0-9]/g, '');

const imgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
  (e.currentTarget as HTMLImageElement).onerror = null;
};

// ─── Types ────────────────────────────────────────────────────────────────
interface SiteContent {
  brandName: string; heroHeadline: string; heroSub: string; heroImage: string;
  heroTagline: string;
  aboutText: string; aboutImage: string; contactPhone: string;
  contactEmail: string; contactInstagram: string;
  philSubtitle: string; philTitle: string; philDesc: string;
  philImg1: string; philImg2: string; philImg3: string;
  stat1Num: string; stat1Label: string;
  stat2Num: string; stat2Label: string;
  stat3Num: string; stat3Label: string;
  stat4Num: string; stat4Label: string;
  ctaTitle: string; ctaDesc: string;
  aboutHeaderTitle: string; aboutHeaderSubtitle: string;
  aboutYearsNum: string; aboutYearsLabel: string;
  principle1Title: string; principle1Desc: string;
  principle2Title: string; principle2Desc: string;
  principle3Title: string; principle3Desc: string;
  servicesHeaderTitle: string; servicesHeaderSubtitle: string;
  portfolioHeaderTitle: string; portfolioHeaderSubtitle: string;
  contactHeaderTitle: string; contactHeaderSubtitle: string;
}
interface Service      { id: number; title: string; desc: string; detailedDesc: string; price: string; image: string; }
interface GalleryItem  { id: number; type: string; url: string; }
interface Project {
  id: number; title: string; location: string; category?: string; year?: string; desc: string; problem: string;
  solution: string; mediaType: 'image' | 'youtube'; mediaUrl: string;
  videoOrientation: 'landscape' | 'portrait';
  gallery: GalleryItem[];
}
interface OngoingProject { id: number; title: string; desc: string; image: string; progress: string; }
interface Testimonial    { id: number; name: string; location: string; text: string; image: string; }
interface TeamMember     { id: number; name: string; role: string; bio: string; image: string; }

// ─── Seed Data ────────────────────────────────────────────────────────────
const INITIAL_CONTENT: SiteContent = {
  brandName:        'Kelvin Armani Enterprise and Interiors',
  heroHeadline:     'Kelvin Armani Interiors and Painting Enterprise',
  heroSub:          'Elevating residential and commercial spaces across Benin City, Edo State, and nationwide with tailored property solutions and impeccable finishes.',
  heroImage:        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000',
  heroTagline:      'Luxury · Precision · Excellence',
  aboutText:        'Based in Benin City, Edo State, Kelvin Armani Enterprise and Interiors specializes in luxury and ultra-modern designs for both homes and offices. Every project presents unique challenges, which is why we conduct a careful assessment to provide tailored solutions for the best possible outcome.\n\nOur involvement depends entirely on your preference — ranging from full project execution to handling specific aspects of the work. We pride ourselves on transparent timelines, exceptional quality of materials, and delivering a wide range of premium property-related services.',
  aboutImage:       'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1000',
  contactPhone:     '+2348154225597',
  contactEmail:     'hello@kelvinarmani.com.ng',
  contactInstagram: 'https://www.instagram.com/kelvinarmani_official',
  philSubtitle:     'Design Philosophy',
  philTitle:        'Excellence in Every Detail',
  philDesc:         'Premium materials, bespoke craftsmanship, and modern aesthetics — combined to create spaces that feel luxurious and intimately yours.',
  philImg1:         'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&q=80&w=1400',
  philImg2:         'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=600',
  philImg3:         'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=600',
  stat1Num:         '50+',
  stat1Label:       'Projects Completed',
  stat2Num:         '8+',
  stat2Label:       'Years of Excellence',
  stat3Num:         '3',
  stat3Label:       'Cities Served',
  stat4Num:         '100%',
  stat4Label:       'Client Satisfaction',
  ctaTitle:         'Your Dream Space\nAwaits',
  ctaDesc:          'Join the exclusive list of homeowners and businesses who trust us to deliver unparalleled luxury and style.',
  aboutHeaderTitle:    'Design with Purpose.',
  aboutHeaderSubtitle: 'Born from a passion for transforming spaces into stories that last a lifetime.',
  aboutYearsNum:       '8+',
  aboutYearsLabel:     'Years of Excellence',
  principle1Title:     'Tailored Solutions',
  principle1Desc:      'Every client is unique. We conduct a careful assessment of each project to deliver solutions perfectly matched to your needs and vision.',
  principle2Title:     'Premium Materials',
  principle2Desc:      'We source only the finest materials — from imported marble to hand-crafted furniture — ensuring lasting quality that exceeds expectations.',
  principle3Title:     'Transparent Process',
  principle3Desc:      'Clear communication, honest timelines, and no hidden costs. We keep you informed and in control at every stage of your project.',
  servicesHeaderTitle:    'Our Services',
  servicesHeaderSubtitle: 'Tailored design packages crafted to suit different needs, budgets, and project scopes.',
  portfolioHeaderTitle:    'A Gallery of\nMasterpieces',
  portfolioHeaderSubtitle: 'Curated luxury spaces designed for Nigeria\'s most discerning clientele.',
  contactHeaderTitle:    'Let\'s Build\nSomething Beautiful',
  contactHeaderSubtitle: 'Whether you have a clear vision or need creative direction, we\'re ready to bring your dream space to life.',
};

const INITIAL_SERVICES: Service[] = [
  { id: 101, title: 'Interior Design & Space Planning', desc: 'Every great space starts with a solid blueprint. We provide comprehensive space planning and interior design concepts tailored to your lifestyle or corporate brand.', detailedDesc: 'From 3D visualizations to optimized layouts, we ensure your residential or commercial space is highly functional and aesthetically pleasing before a single drop of paint is applied.\n\nKey Deliverables:\n• 3D Renderings & Visuals\n• Space Planning & Flow Optimization\n• Residential & Office Concept Design\n• Mood Boards & Material Selections', price: 'Based on Scale & Complexity', image: '' },
  { id: 102, title: 'Professional Painting & Wall Finishing', desc: 'Transform your walls into statement pieces. We specialize in high-end wall treatments and decorative finishes that elevate any space beyond the ordinary.', detailedDesc: 'Our expert team handles everything from flawless wall screeding and POP ceiling installations to decorative finishes, commercial wall branding, and custom murals.\n\nKey Deliverables:\n• Wall Screeding & POP Ceiling Works\n• Interior & Exterior Painting\n• Custom Wallpapers & Feature Murals\n• Decorative Finishes (Stucco, Limewash, Venetian Plaster)', price: 'Per-Project Basis', image: '' },
  { id: 103, title: 'Bespoke Furnishing & Final Styling', desc: 'A beautifully finished room is just the canvas. We complete your vision with curated styling, expert procurement, and bespoke furniture tailored to your exact space.', detailedDesc: 'By carefully selecting the right upholstery, lighting, window treatments, and accessories, we bring warmth, character, and absolute luxury to your completed project.\n\nKey Deliverables:\n• Custom Furniture & Upholstery Sourcing\n• Lighting Design & Fixture Selection\n• Window Treatments & Bespoke Blinds\n• Final Room Staging & Accessorizing', price: 'Custom Quote', image: '' },
];

const INITIAL_PROJECTS: Project[] = [
  { id: 103, title: 'GRA Luxury Penthouse', location: 'GRA, Benin City', category: 'Interior Architecture', year: '2024', desc: 'A complete redesign of a luxury penthouse in the heart of Benin City, focusing on natural light, neutral tones, and open-plan living.', problem: 'The client felt the original space was too dark and cramped, lacking the flow needed for entertaining high-profile guests.', solution: 'We removed non-structural partitions, introduced a lighter palette, and sourced low-profile modern furniture to dramatically expand the perception of space.', mediaType: 'image', mediaUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200', videoOrientation: 'landscape', gallery: [{ id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1600607687644-aac4c1566f03?auto=format&fit=crop&q=80&w=800' }, { id: 2, type: 'image', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800' }] },
  { id: 102, title: 'Lekki Coastal Villa', location: 'Lekki Phase 1, Lagos', category: 'Interior Architecture', year: '2024', desc: 'Bringing a sophisticated, airy tropical feel to a family home nestled in the vibrant heart of Lekki.', problem: "The home felt outdated with heavy woods and dark fabrics that clashed with the warm Nigerian climate and the family's modern lifestyle.", solution: 'We implemented organic textures, light oak woods, and subtle breezy accents to seamlessly blend the indoor space with its tropical environment.', mediaType: 'image', mediaUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1200', videoOrientation: 'landscape', gallery: [{ id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=800' }] },
];

const INITIAL_ONGOING: OngoingProject[] = [
  { id: 102, title: 'Maitama Luxury Duplex', desc: 'Currently in the finishing phase. A contemporary 5-bedroom duplex with custom marble fittings and smart home integration.', image: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?auto=format&fit=crop&q=80&w=800', progress: '85%' },
  { id: 101, title: 'Victoria Island Corporate Office', desc: 'Open-plan workspace for a leading tech startup. Acoustic treatments and bespoke joinery currently underway.', image: 'https://images.unsplash.com/photo-1541888081128-4ee055b08492?auto=format&fit=crop&q=80&w=800', progress: '40%' },
];

const INITIAL_TESTIMONIALS: Testimonial[] = [
  { id: 102, name: 'Chief Adebayo', location: 'Asokoro, Abuja', text: 'Kelvin Armani Enterprise and Interiors transformed our villa into an absolute masterpiece. The attention to detail and understanding of premium ultra-modern aesthetics is simply unmatched in Nigeria.', image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&q=80&w=400' },
];

const INITIAL_TEAM: TeamMember[] = [
  { id: 101, name: 'Kelvin Armani', role: 'Principal Designer & Founder', bio: 'With a visionary approach to ultra-modern design, Kelvin leads the creative direction of every project, ensuring global luxury standards are met while infusing unique and deeply personal touches.', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400' },
];

// ─── Shared Admin Styles ──────────────────────────────────────────────────
const inputCls = "w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#8C7A6B] transition-all bg-white";
const labelCls = "block text-[9px] font-bold text-gray-500 uppercase tracking-[0.35em] mb-2";

// ─── Image Uploader Component ─────────────────────────────────────────────
function ImageUploader({ currentUrl, onUpload, label }: { currentUrl: string; onUpload: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!_storage) { alert('Firebase Storage not connected. Paste a URL instead.'); return; }
    setUploading(true);
    const sRef = storageRef(_storage, `images/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(sRef, file);
    task.on(
      'state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err)  => { console.error(err); setUploading(false); alert('Upload failed: ' + err.message); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onUpload(url);
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
      }
    );
  };

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="flex gap-4 items-start">
        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
          {currentUrl
            ? <img src={currentUrl} alt="" className="w-full h-full object-cover" onError={imgError} />
            : <ImageIcon size={24} className="text-gray-300" />}
        </div>
        <div className="flex-1 space-y-2">
          <input type="file" accept="image/*,video/*" ref={inputRef} onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-700"
          >
            <Upload size={14} /> {uploading ? `Uploading ${progress}%…` : 'Upload from Device'}
          </button>
          {uploading && (
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-full">
              <div className="h-full bg-[#8C7A6B] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="text-[10px] text-gray-400 font-medium">or paste a URL directly:</p>
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => onUpload(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#8C7A6B] transition-all"
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );
    const refresh = () => document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    refresh();
    const t = setTimeout(refresh, 400);
    return () => { io.disconnect(); clearTimeout(t); };
  });
}

const getRouteFromPath = (path: string): string => {
  const clean = path.replace(/^\/+/, '').split('/')[0];
  return clean || 'home';
};

// ═══════════════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,            setUser]            = useState<any>(null);
  const [loading,         setLoading]         = useState(true);
  const [content,         setContent]         = useState<SiteContent | null>(null);
  const [services,        setServices]        = useState<Service[] | null>(null);
  const [projects,        setProjects]        = useState<Project[] | null>(null);
  const [ongoingProjects, setOngoingProjects] = useState<OngoingProject[] | null>(null);
  const [testimonials,    setTestimonials]    = useState<Testimonial[] | null>(null);
  const [teamMembers,     setTeamMembers]     = useState<TeamMember[] | null>(null);
  const [currentRoute,    setCurrentRoute]    = useState(() => {
    const route = getRouteFromPath(window.location.pathname);
    if (window.location.pathname.startsWith('/project/')) return 'project-detail';
    return route;
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAdminAuth,     setIsAdminAuth]     = useState(false);
  const [pageVisible,     setPageVisible]     = useState(true);

  const [loadedKeys, setLoadedKeys] = useState<{ [key: string]: boolean }>(() => {
    if (!FIREBASE_READY) {
      return {
        content: true,
        services: true,
        projects: true,
        ongoingProjects: true,
        testimonials: true,
        teamMembers: true,
      };
    }
    return {
      content: false,
      services: false,
      projects: false,
      ongoingProjects: false,
      testimonials: false,
      teamMembers: false,
    };
  });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useScrollReveal();

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 1200);
    const safetyTimer = setTimeout(() => {
      setMinTimeElapsed(true);
      setLoadedKeys({
        content: true,
        services: true,
        projects: true,
        ongoingProjects: true,
        testimonials: true,
        teamMembers: true,
      });
      setContent(prev => prev ?? INITIAL_CONTENT);
      setServices(prev => prev ?? INITIAL_SERVICES);
      setProjects(prev => prev ?? INITIAL_PROJECTS);
      setOngoingProjects(prev => prev ?? INITIAL_ONGOING);
      setTestimonials(prev => prev ?? INITIAL_TESTIMONIALS);
      setTeamMembers(prev => prev ?? INITIAL_TEAM);
    }, 4000);
    return () => {
      clearTimeout(t);
      clearTimeout(safetyTimer);
    };
  }, []);

  const isFullyLoaded = Object.values(loadedKeys).every(Boolean);

  useEffect(() => {
    if (minTimeElapsed && isFullyLoaded) {
      setLoading(false);
    }
  }, [minTimeElapsed, isFullyLoaded]);

  // Dynamic SEO
  useEffect(() => {
    if (!content) return;
    const base = window.location.href.split('#')[0];
    let title = `${content.brandName} | Interior Design in Benin City`;
    let desc  = content.heroSub;
    let image = content.heroImage;
    if (currentRoute === 'project-detail' && selectedProject) {
      title = `${selectedProject.title} | ${content.brandName}`;
      desc  = selectedProject.desc;
      image = selectedProject.mediaType === 'youtube'
        ? `https://img.youtube.com/vi/${getYouTubeId(selectedProject.mediaUrl)}/maxresdefault.jpg`
        : selectedProject.mediaUrl;
    }
    document.title = title;
    const meta = (attr: string, val: string, c: string) => {
      let el = document.querySelector(`meta[${attr}="${val}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
      el.setAttribute('content', c);
    };
    meta('name', 'description', desc);
    meta('property', 'og:title', title);
    meta('property', 'og:description', desc);
    meta('property', 'og:image', image);
  }, [content, currentRoute, selectedProject]);

  // Firebase Auth
  useEffect(() => {
    if (!FIREBASE_READY || !_auth) return;
    signInAnonymously(_auth).catch((e) => {
      console.warn('Auth failed:', e);
      setLoadedKeys({
        content: true,
        services: true,
        projects: true,
        ongoingProjects: true,
        testimonials: true,
        teamMembers: true,
      });
      setContent(prev => prev ?? INITIAL_CONTENT);
      setServices(prev => prev ?? INITIAL_SERVICES);
      setProjects(prev => prev ?? INITIAL_PROJECTS);
      setOngoingProjects(prev => prev ?? INITIAL_ONGOING);
      setTestimonials(prev => prev ?? INITIAL_TESTIMONIALS);
      setTeamMembers(prev => prev ?? INITIAL_TEAM);
    });
    const unsub = onAuthStateChanged(_auth, setUser);
    return () => unsub();
  }, []);

  // Firestore real-time listeners
  useEffect(() => {
    if (!FIREBASE_READY || !_db || !user) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(_db, 'websiteContent', 'main'),
        (s) => {
          if (s.exists()) {
            setContent({ ...INITIAL_CONTENT, ...s.data() } as SiteContent);
          } else {
            setContent(prev => prev ?? INITIAL_CONTENT);
          }
          setLoadedKeys((prev) => ({ ...prev, content: true }));
        },
        (err) => {
          console.error('Content fetch error:', err);
          setContent(prev => prev ?? INITIAL_CONTENT);
          setLoadedKeys((prev) => ({ ...prev, content: true }));
        }
      )
    );

    const col = (name: string, setter: React.Dispatch<React.SetStateAction<any>>, key: string, fallback: any, asc = false) =>
      onSnapshot(
        collection(_db, name),
        (s) => {
          if (!s.empty) {
            setter(
              s.docs.map((d) => {
                const data = d.data();
                const numId = Number(d.id);
                return { ...data, id: isNaN(numId) ? d.id : numId };
              }).sort((a: any, b: any) => {
                const idA = a.id;
                const idB = b.id;
                if (typeof idA === 'number' && typeof idB === 'number') {
                  return asc ? idA - idB : idB - idA;
                }
                return asc ? String(idA).localeCompare(String(idB)) : String(idB).localeCompare(String(idA));
              })
            );
          } else {
            setter([]);
          }
          setLoadedKeys((prev) => ({ ...prev, [key]: true }));
        },
        (err) => {
          console.error(`Collection ${name} fetch error:`, err);
          setter(prev => prev ?? fallback);
          setLoadedKeys((prev) => ({ ...prev, [key]: true }));
        }
      );

    unsubs.push(col('services',        setServices,        'services',        INITIAL_SERVICES,        true));
    unsubs.push(col('projects',        setProjects,        'projects',        INITIAL_PROJECTS));
    unsubs.push(col('ongoingProjects', setOngoingProjects, 'ongoingProjects', INITIAL_ONGOING));
    unsubs.push(col('testimonials',    setTestimonials,    'testimonials',    INITIAL_TESTIMONIALS));
    unsubs.push(col('teamMembers',     setTeamMembers,     'teamMembers',     INITIAL_TEAM,            true));

    return () => unsubs.forEach((fn) => fn());
  }, [user]);

  // Sync selectedProject when projects list changes or routes change
  useEffect(() => {
    if (window.location.pathname.startsWith('/project/')) {
      const idStr = window.location.pathname.split('/').pop() || '';
      const id = Number(idStr);
      const found = (projects || []).find(p => p.id === id) || INITIAL_PROJECTS.find(p => p.id === id) || null;
      if (found) setSelectedProject(found);
    }
  }, [projects]);

  // Handle Popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const route = getRouteFromPath(path);
      if (path.startsWith('/project/')) {
        const id = Number(path.split('/').pop() || '');
        const found = (projects || []).find(p => p.id === id) || INITIAL_PROJECTS.find(p => p.id === id) || null;
        setCurrentRoute('project-detail');
        setSelectedProject(found);
      } else {
        setCurrentRoute(route);
        setSelectedProject(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projects]);

  const navigate = useCallback((route: string, project: Project | null = null, snapMobile = false) => {
    const isMobile = window.innerWidth < 768;
    const shouldSnap = isMobile && snapMobile;

    const performNavigation = () => {
      setCurrentRoute(route);
      setSelectedProject(project);

      // Update URL path without reloading
      let newPath = '/';
      if (route === 'project-detail' && project) {
        newPath = `/project/${project.id}`;
      } else if (route !== 'home') {
        newPath = `/${route}`;
      }
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    if (shouldSnap) {
      performNavigation();
    } else {
      setPageVisible(false);
      setTimeout(() => {
        performNavigation();
        setPageVisible(true);
      }, 300);
    }
  }, []);

  const openWhatsApp = () => {
    const phone = cleanPhone(content?.contactPhone || '');
    window.open(`https://wa.me/${phone}?text=Hi! I am interested in your interior design services.`, '_blank');
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#1A1A1A] font-sans selection:bg-[#8C7A6B] selection:text-white flex flex-col">
      <Navbar navigate={navigate} currentRoute={currentRoute} />

      <main className={`flex-grow page-transition ${pageVisible ? 'page-visible' : 'page-hidden'}`}>
        {currentRoute === 'home'           && <HomeView navigate={navigate} content={content || INITIAL_CONTENT} projects={projects || []} ongoingProjects={ongoingProjects || []} testimonials={testimonials || []} />}
        {currentRoute === 'about'          && <AboutView content={content || INITIAL_CONTENT} teamMembers={teamMembers || []} />}
        {currentRoute === 'services'       && <ServicesView services={services || []} navigate={navigate} content={content || INITIAL_CONTENT} />}
        {currentRoute === 'portfolio'      && <PortfolioView projects={projects || []} navigate={navigate} content={content || INITIAL_CONTENT} />}
        {currentRoute === 'project-detail' && <ProjectDetailView project={selectedProject} navigate={navigate} />}
        {currentRoute === 'contact'        && <ContactView content={content || INITIAL_CONTENT} />}
        {currentRoute === 'admin'          && (
          isAdminAuth
            ? <AdminDashboard
                content={content || INITIAL_CONTENT}        setContent={setContent}
                services={services || []}      setServices={setServices}
                projects={projects || []}      setProjects={setProjects}
                ongoingProjects={ongoingProjects || []} setOngoingProjects={setOngoingProjects}
                testimonials={testimonials || []}       setTestimonials={setTestimonials}
                teamMembers={teamMembers || []}         setTeamMembers={setTeamMembers}
                setIsAdminAuth={setIsAdminAuth}
              />
            : <AdminLogin setIsAdminAuth={setIsAdminAuth} />
        )}
      </main>

      <Footer content={content || INITIAL_CONTENT} navigate={navigate} />

      {/* WhatsApp FAB */}
      <button
        onClick={openWhatsApp}
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-2xl flex items-center justify-center hover:bg-[#1ebd5a] hover:scale-110 transition-all duration-300"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOADING SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#1A1A1A] flex flex-col items-center justify-center">
      <div className="text-center animate-loading-pulse">
        <div className="w-12 h-px bg-[#8C7A6B] mx-auto mb-8" />
        <h1 className="text-4xl font-serif text-white">Kelvin Armani</h1>
        <p className="text-[8px] uppercase tracking-[0.2em] text-gray-500 mt-3">Interiors and Painting Enterprise</p>
        <div className="w-12 h-px bg-[#8C7A6B] mx-auto mt-8" />
      </div>
      <div className="absolute bottom-10 flex gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="w-1 h-1 rounded-full bg-[#8C7A6B] animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  NAVBAR
// ═══════════════════════════════════════════════════════════════════════════
function Navbar({ navigate, currentRoute }: { navigate: any; currentRoute: string }) {
  const [open,     setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const isHome  = currentRoute === 'home';
  const ghost   = isHome && !scrolled && !open;
  const navLinks = ['home', 'about', 'services', 'portfolio', 'contact'];

  const go = (e: React.MouseEvent, id: string) => { e.preventDefault(); navigate(id); setOpen(false); };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${ghost ? 'bg-transparent' : 'bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 flex items-center justify-between h-[72px] md:h-[88px]">
        <a href="#home" onClick={(e) => go(e, 'home')} className="flex-shrink-0 group">
          <span className={`block text-base md:text-xl font-serif font-medium tracking-tight leading-none transition-colors duration-500 ${ghost ? 'text-white' : 'text-[#1A1A1A]'}`}>Kelvin Armani</span>
          <p className={`block text-[7px] md:text-[8px] uppercase tracking-[0.25em] font-semibold leading-none mt-1 transition-colors duration-500 ${ghost ? 'text-white/70' : 'text-[#8C7A6B]'}`}>Interiors and Painting Enterprise</p>
        </a>

        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((id) => {
            const active = currentRoute === id;
            return (
              <a key={id} href={`#${id}`} onClick={(e) => go(e, id)}
                className={`relative text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors duration-300 group ${ghost ? (active ? 'text-white' : 'text-white/85 hover:text-white') : (active ? 'text-[#8C7A6B]' : 'text-gray-500 hover:text-[#1A1A1A]')}`}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
                <span className={`absolute -bottom-1 left-0 h-px bg-[#8C7A6B] transition-all duration-300 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </a>
            );
          })}
          <a href="#admin" onClick={(e) => go(e, 'admin')} title="Admin" className={`p-1 transition-colors ${ghost ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'}`}>
            <Lock size={13} />
          </a>
        </div>

        <button onClick={() => setOpen(!open)} aria-label="Toggle menu" className={`md:hidden p-2 ${ghost ? 'text-white' : 'text-[#1A1A1A]'}`}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-500 ${open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white border-t border-gray-50 px-6 pb-6 pt-2">
          {navLinks.map((id, i) => (
            <a key={id} href={`#${id}`} onClick={(e) => go(e, id)}
              className={`flex items-center justify-between py-4 text-sm uppercase tracking-[0.2em] font-semibold border-b border-gray-50 last:border-0 transition-colors ${currentRoute === id ? 'text-[#8C7A6B]' : 'text-gray-700'}`}
              style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}>
              {id.charAt(0).toUpperCase() + id.slice(1)}
              <ArrowRight size={14} className="text-[#8C7A6B] opacity-40" />
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FOOTER
// ═══════════════════════════════════════════════════════════════════════════
function Footer({ content, navigate }: { content: SiteContent; navigate: any }) {
  const go   = (e: React.MouseEvent, id: string) => { e.preventDefault(); navigate(id, null, true); };
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#111111] text-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-16 pb-10 md:pt-20 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-white/10">
          <div>
            <h3 className="text-xl font-serif mb-1">{content?.brandName}</h3>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[#8C7A6B] mb-4">Interiors and Painting Enterprise</p>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">Elevating everyday spaces into extraordinary places across Nigeria.</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-[#8C7A6B] font-semibold mb-6">Navigation</p>
            <div className="space-y-3">
              {['home', 'about', 'services', 'portfolio', 'contact'].map((id) => (
                <a key={id} href={`#${id}`} onClick={(e) => go(e, id)} className="block text-gray-400 hover:text-white transition-colors text-sm capitalize">{id}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-[#8C7A6B] font-semibold mb-6">Contact</p>
            <div className="space-y-4">
              {content?.contactPhone && (
                <a href={`tel:${content.contactPhone}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                  <Phone size={13} className="text-[#8C7A6B] shrink-0" />{content.contactPhone}
                </a>
              )}
              {content?.contactEmail && (
                <a href={`mailto:${content.contactEmail}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm break-all">
                  <Mail size={13} className="text-[#8C7A6B] shrink-0" />{content.contactEmail}
                </a>
              )}
              {content?.contactInstagram && (
                <a href={content.contactInstagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                  <Instagram size={13} className="text-[#8C7A6B] shrink-0" />@kelvinarmani_official
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-[11px] text-gray-400">
          <p>© {year} {content?.brandName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <p>Designed by <span className="text-gray-300">The Clean Brand Agency</span></p>
            <a href="#admin" onClick={(e) => go(e, 'admin')} className="hover:text-gray-200 transition-colors">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOME VIEW
// ═══════════════════════════════════════════════════════════════════════════
function HomeView({ navigate, content, projects, ongoingProjects, testimonials }: any) {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative h-[100svh] min-h-[640px] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 scale-110 will-change-transform" style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.1)` }}>
          <img src={content?.heroImage} alt="Kelvin Armani Interiors" fetchPriority="high" className="w-full h-full object-cover" onError={imgError} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/50 to-black/80" />

        <div className="relative z-10 text-white text-center max-w-5xl mx-auto px-6 mt-16">
          <p className="text-[9px] uppercase tracking-[0.6em] text-[#C4A882] mb-6 opacity-0 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {content?.heroTagline || 'Luxury · Precision · Excellence'}
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif font-medium leading-[0.95] mb-6 md:mb-8 opacity-0 animate-fade-up" style={{ animationDelay: '0.55s' }}>
            {content?.heroHeadline}
          </h1>
          <p className="text-sm md:text-lg text-white/85 font-light max-w-xl mx-auto mb-10 md:mb-14 leading-relaxed opacity-0 animate-fade-up" style={{ animationDelay: '0.75s' }}>
            {content?.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: '0.95s' }}>
            <button onClick={() => navigate('contact')} className="w-full sm:w-auto px-10 py-4 bg-[#8C7A6B] text-white text-[10px] uppercase tracking-[0.35em] font-bold hover:bg-[#7a6a5c] hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-10px_rgba(140,122,107,0.6)] transition-all duration-300">
              Book a Consultation
            </button>
            <button onClick={() => navigate('portfolio')} className="w-full sm:w-auto px-10 py-4 border border-white/50 text-white text-[10px] uppercase tracking-[0.35em] font-semibold hover:bg-white/10 hover:border-white/80 transition-all duration-300">
              View Our Work
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/50">
          <p className="text-[8px] uppercase tracking-[0.5em]">Scroll</p>
          <div className="w-px h-12 bg-white/25 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full bg-white/70 h-1/2 animate-scroll-line" />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] py-4 overflow-hidden">
        <div className="animate-marquee inline-flex gap-16">
          {['Interior Design', 'Space Planning', 'Luxury Furnishing', 'Wall Finishing', 'POP Ceilings', 'Custom Upholstery', 'Project Management', 'Final Styling', 'Interior Design', 'Space Planning', 'Luxury Furnishing', 'Wall Finishing', 'POP Ceilings', 'Custom Upholstery', 'Project Management', 'Final Styling'].map((s, i) => (
            <span key={i} className="text-[10px] uppercase tracking-[0.4em] text-gray-500 flex items-center gap-16">
              {s} <span className="text-[#8C7A6B]">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── PHILOSOPHY ───────────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 items-end gap-6 mb-14 md:mb-20">
            <div>
              <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-4">{content?.philSubtitle || 'Design Philosophy'}</p>
              <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl lg:text-6xl font-serif leading-[1.05] whitespace-pre-line">{content?.philTitle || 'Excellence in\nEvery Detail'}</h2>
            </div>
            <p className="reveal reveal-delay-2 text-gray-600 md:text-right max-w-sm ml-auto leading-relaxed text-sm md:text-base whitespace-pre-line">
              {content?.philDesc || 'Premium materials, bespoke craftsmanship, and modern aesthetics — combined to create spaces that feel luxurious and intimately yours.'}
            </p>
          </div>

          <div className="grid grid-cols-12 gap-3 md:gap-4 h-auto md:h-[700px]">
            <div className="col-span-12 md:col-span-8 md:row-span-2 overflow-hidden relative group rounded-sm reveal h-[280px] md:h-auto">
              <img src={content?.philImg1 || "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&q=80&w=1400"} alt="Luxury living space" loading="lazy" className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105" onError={imgError} />
            </div>
            <div className="col-span-6 md:col-span-4 overflow-hidden relative group rounded-sm reveal reveal-delay-1 h-[180px] md:h-[340px]">
              <img src={content?.philImg2 || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=600"} alt="Modern detail" loading="lazy" className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105" onError={imgError} />
            </div>
            <div className="col-span-6 md:col-span-4 overflow-hidden relative group rounded-sm reveal reveal-delay-2 h-[180px] md:h-[348px]">
              <img src={content?.philImg3 || "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=600"} alt="Premium decor" loading="lazy" className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105" onError={imgError} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 md:mt-24 pt-12 border-t border-gray-100">
            {[
              { n: content?.stat1Num || '50+', l: content?.stat1Label || 'Projects Completed' },
              { n: content?.stat2Num || '8+', l: content?.stat2Label || 'Years of Excellence' },
              { n: content?.stat3Num || '3', l: content?.stat3Label || 'Cities Served' },
              { n: content?.stat4Num || '100%', l: content?.stat4Label || 'Client Satisfaction' }
            ].map((s, i) => (
              <div key={i} className={`reveal reveal-delay-${i}`}>
                <p className="text-4xl md:text-5xl font-serif text-[#8C7A6B] mb-2">{s.n}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ONGOING PROJECTS ─────────────────────────────────── */}
      {ongoingProjects.length > 0 && (
        <section className="py-20 md:py-32 bg-[#FAF9F7] border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6 sm:px-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-14">
              <div>
                <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-3">Behind the Scenes</p>
                <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-serif">Ongoing Projects</h2>
              </div>
              <p className="reveal reveal-delay-2 text-gray-600 text-sm max-w-xs md:text-right leading-relaxed">A sneak peek into the beautiful spaces we're currently bringing to life.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {ongoingProjects.map((proj: OngoingProject, i: number) => (
                <div key={proj.id} className={`reveal reveal-delay-${i} group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500`}>
                  <div className="h-52 overflow-hidden relative">
                    <img src={proj.image || PLACEHOLDER} alt={proj.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105" onError={imgError} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                      <h3 className="text-white font-serif text-xl drop-shadow">{proj.title}</h3>
                      <span className="text-[#C4A882] font-bold text-base">{proj.progress}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 text-sm leading-relaxed mb-5 line-clamp-2">{proj.desc}</p>
                    <div>
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-[#8C7A6B] to-[#C4A882] h-full rounded-full" style={{ width: proj.progress }} />
                      </div>
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold mt-2">Project Progress</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PORTFOLIO PREVIEW ────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex justify-between items-end mb-14">
            <div>
              <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-3">Our Portfolio</p>
              <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-serif">Completed Masterpieces</h2>
            </div>
            <button onClick={() => navigate('portfolio')} className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-[#8C7A6B] hover:gap-4 transition-all duration-300">
              See All <ArrowRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
            {projects.slice(0, 2).map((p: Project, i: number) => (
              <div key={p.id} className={`reveal reveal-delay-${i} group cursor-pointer`} onClick={() => navigate('project-detail', p)}>
                <div className="overflow-hidden relative rounded-sm mb-5 aspect-[4/3]">
                  {p.mediaType === 'youtube' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                        <Video className="text-white ml-1" size={22} />
                      </div>
                    </div>
                  )}
                  <img
                    src={p.mediaType === 'youtube' ? `https://img.youtube.com/vi/${getYouTubeId(p.mediaUrl)}/hqdefault.jpg` : p.mediaUrl}
                    alt={p.title} loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105"
                    onError={imgError}
                  />
                </div>
                <p className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold mb-2">{p.location}</p>
                <h3 className="text-2xl md:text-3xl font-serif group-hover:text-[#8C7A6B] transition-colors duration-300 mb-3">{p.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">{p.desc}</p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-0.5 group-hover:text-[#8C7A6B] group-hover:border-[#8C7A6B] transition-colors duration-300">
                  View Case Study <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-10 md:hidden">
            <button onClick={() => navigate('portfolio')} className="w-full py-4 border border-gray-200 text-[10px] uppercase tracking-[0.3em] font-bold text-gray-600 hover:border-[#8C7A6B] hover:text-[#8C7A6B] transition-colors flex items-center justify-center gap-2">
              See All Projects <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-20 md:py-32 bg-[#111111] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '48px 48px' }} />
          <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
            <div className="text-center mb-14 md:mb-20">
              <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-4">Client Stories</p>
              <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-serif">What Our Clients Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((t: Testimonial, i: number) => (
                <div key={t.id} className={`reveal reveal-delay-${i} relative bg-white/[0.06] border border-white/10 rounded-2xl p-8 md:p-12 hover:bg-white/[0.09] transition-colors duration-500`}>
                  <Quote size={44} className="absolute top-6 right-6 text-[#8C7A6B] opacity-15" />
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#8C7A6B" className="text-[#8C7A6B]" />)}
                  </div>
                  <p className="text-gray-200 italic leading-loose text-base md:text-lg mb-10">"{t.text}"</p>
                  <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                    <img src={t.image || PLACEHOLDER} alt={t.name} loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-[#8C7A6B]/40" onError={imgError} />
                    <div>
                      <p className="font-serif text-white text-lg">{t.name}</p>
                      <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">{t.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-[#FAF9F7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="reveal text-[9px] uppercase tracking-[0.5em] text-[#8C7A6B] font-bold mb-5">Ready to Begin?</p>
          <h2 className="reveal reveal-delay-1 text-4xl md:text-6xl font-serif leading-tight mb-6 whitespace-pre-line">{content?.ctaTitle || 'Your Dream Space\nAwaits'}</h2>
          <p className="reveal reveal-delay-2 text-gray-600 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            {content?.ctaDesc || 'Join the exclusive list of homeowners and businesses who trust us to deliver unparalleled luxury and style.'}
          </p>
          <div className="reveal reveal-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('contact')} className="px-12 py-5 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.35em] font-bold hover:bg-[#8C7A6B] hover:-translate-y-0.5 transition-all duration-300">
              Start Your Project
            </button>
            <button onClick={() => navigate('services')} className="px-12 py-5 border border-gray-300 text-[#1A1A1A] text-[10px] uppercase tracking-[0.35em] font-bold hover:border-[#8C7A6B] hover:text-[#8C7A6B] transition-all duration-300">
              Explore Services
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ABOUT VIEW
// ═══════════════════════════════════════════════════════════════════════════
function AboutView({ content, teamMembers }: { content: SiteContent; teamMembers: TeamMember[] }) {
  return (
    <div>
      <section className="bg-[#111111] text-white pt-[110px] pb-20 md:pt-[148px] md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '44px 44px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-[9px] uppercase tracking-[0.55em] text-[#8C7A6B] font-bold mb-6">Our Story</p>
          <h1 className="text-5xl md:text-7xl font-serif leading-tight mb-6">{content?.aboutHeaderTitle || 'Design with Purpose.'}</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">{content?.aboutHeaderSubtitle || 'Born from a passion for transforming spaces into stories that last a lifetime.'}</p>
        </div>
      </section>

      <section className="py-20 md:py-32 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="reveal order-2 lg:order-1 relative">
            <img src={content?.aboutImage} alt="About Kelvin Armani" fetchPriority="high" className="w-full h-[480px] md:h-[680px] object-cover shadow-2xl" onError={imgError} />
            <div className="absolute -bottom-5 -right-5 bg-[#8C7A6B] text-white p-8 hidden md:block">
              <p className="text-5xl font-serif font-bold">{content?.aboutYearsNum || '8+'}</p>
              <p className="text-[10px] uppercase tracking-widest mt-1 text-white/80">{content?.aboutYearsLabel || 'Years of Excellence'}</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-4">Who We Are</p>
            <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-serif mb-8 leading-tight">Crafting Luxury Spaces Across Nigeria</h2>
            <p className="reveal reveal-delay-2 text-gray-600 text-base md:text-lg leading-loose mb-8 whitespace-pre-line">{content?.aboutText}</p>
            <div className="reveal reveal-delay-3 grid grid-cols-2 gap-6 pt-8 border-t border-gray-100">
              <div><p className="text-3xl font-serif text-[#8C7A6B] mb-1">{content?.stat1Num || '50+'}</p><p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{content?.stat1Label || 'Projects Completed'}</p></div>
              <div><p className="text-3xl font-serif text-[#8C7A6B] mb-1">{content?.stat4Num || '100%'}</p><p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{content?.stat4Label || 'Client Satisfaction'}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-[#FAF9F7] border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-14">
            <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-4">Our Principles</p>
            <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-serif">What Drives Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { t: content?.principle1Title || 'Tailored Solutions', d: content?.principle1Desc || 'Every client is unique. We conduct a careful assessment of each project to deliver solutions perfectly matched to your needs and vision.' },
              { t: content?.principle2Title || 'Premium Materials',  d: content?.principle2Desc || 'We source only the finest materials — from imported marble to hand-crafted furniture — ensuring lasting quality that exceeds expectations.' },
              { t: content?.principle3Title || 'Transparent Process', d: content?.principle3Desc || 'Clear communication, honest timelines, and no hidden costs. We keep you informed and in control at every stage of your project.' },
            ].map((v, i) => (
              <div key={i} className={`reveal reveal-delay-${i} bg-white p-8 md:p-10 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow duration-300`}>
                <div className="w-10 h-px bg-[#8C7A6B] mb-6" />
                <h3 className="text-xl md:text-2xl font-serif mb-4">{v.t}</h3>
                <p className="text-gray-600 text-sm leading-loose">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {teamMembers.length > 0 && (
        <section className="py-20 md:py-32 max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-14 md:mb-20">
            <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-4">The Visionaries</p>
            <h2 className="reveal reveal-delay-1 text-4xl md:text-5xl font-serif">Meet Our Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {teamMembers.map((m: TeamMember, i: number) => (
              <div key={m.id} className={`reveal reveal-delay-${i} group text-center`}>
                <div className="relative mb-6 overflow-hidden rounded-sm aspect-[3/4]">
                  <img src={m.image || PLACEHOLDER} alt={m.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105" onError={imgError} />
                </div>
                <p className="text-[9px] uppercase tracking-widest text-[#8C7A6B] font-bold mb-2">{m.role}</p>
                <h3 className="text-2xl font-serif mb-3">{m.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICES VIEW
// ═══════════════════════════════════════════════════════════════════════════
function ServicesView({ services, navigate, content }: { services: Service[]; navigate: any; content: SiteContent }) {
  const [selected, setSelected] = useState<Service | null>(null);

  return (
    <div>
      <section className="bg-[#111111] text-white pt-[110px] pb-20 md:pt-[148px] md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '44px 44px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-[9px] uppercase tracking-[0.55em] text-[#8C7A6B] font-bold mb-6">Expertise</p>
          <h1 className="text-5xl md:text-7xl font-serif leading-tight mb-6">{content?.servicesHeaderTitle || 'Our Services'}</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">{content?.servicesHeaderSubtitle || 'Tailored design packages crafted to suit different needs, budgets, and project scopes.'}</p>
        </div>
      </section>

      <section className="py-20 md:py-32 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="divide-y divide-gray-100">
          {services.map((svc, i) => (
            <div key={svc.id} onClick={() => setSelected(svc)}
              className="reveal group flex flex-col md:flex-row md:items-center justify-between gap-6 py-10 md:py-14 cursor-pointer hover:pl-4 transition-all duration-300">
              <div className="flex items-start gap-8 flex-1">
                <span className="font-serif text-3xl md:text-5xl text-[#8C7A6B] opacity-20 group-hover:opacity-100 transition-opacity duration-300 leading-none pt-1 w-12 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif mb-3 group-hover:text-[#8C7A6B] transition-colors duration-300">{svc.title}</h3>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-2xl">{svc.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-5 pl-20 md:pl-0 shrink-0">
                <span className="text-sm text-gray-500 hidden md:block font-medium">{svc.price}</span>
                <div className="w-11 h-11 rounded-full border border-gray-200 group-hover:border-[#8C7A6B] group-hover:bg-[#8C7A6B] flex items-center justify-center transition-all duration-300">
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal mt-16 md:mt-24 bg-[#111111] text-white rounded-2xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-3">Ready to Start?</p>
            <h3 className="text-3xl md:text-4xl font-serif">Let's Discuss Your Project</h3>
          </div>
          <button onClick={() => navigate('contact')} className="shrink-0 px-10 py-4 bg-[#8C7A6B] text-white text-[10px] uppercase tracking-[0.35em] font-bold hover:bg-[#7a6a5c] transition-colors">
            Get In Touch
          </button>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-white w-full md:max-w-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#8C7A6B] font-bold mb-1">Service Details</p>
                <h3 className="text-2xl md:text-3xl font-serif pr-4">{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"><X size={18} /></button>
            </div>
            {selected.image && (
              <div className="h-48 shrink-0"><img src={selected.image} alt={selected.title} className="w-full h-full object-cover" onError={imgError} /></div>
            )}
            <div className="p-6 md:p-8 overflow-y-auto">
              <p className="text-gray-700 leading-loose text-sm md:text-base whitespace-pre-line mb-8">{selected.detailedDesc || selected.desc}</p>
              <div className="flex items-center justify-between bg-[#FAF9F7] rounded-xl p-5 border border-gray-100 gap-4 flex-col sm:flex-row">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold mb-1">Pricing</p>
                  <p className="text-xl font-bold">{selected.price}</p>
                </div>
                <button onClick={() => { setSelected(null); navigate('contact'); }} className="w-full sm:w-auto px-8 py-3.5 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-[#8C7A6B] transition-colors rounded-lg">
                  Inquire Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PORTFOLIO VIEW
// ═══════════════════════════════════════════════════════════════════════════
function PortfolioView({ projects, navigate, content }: { projects: Project[]; navigate: any; content: SiteContent }) {
  if (!projects.length) return <div className="py-48 text-center text-gray-500">No projects yet. Check back soon!</div>;
  const [featured, ...rest] = projects;

  return (
    <div className="bg-white">
      <section className="bg-[#111111] text-white pt-[110px] pb-20 md:pt-[148px] md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '44px 44px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-[9px] uppercase tracking-[0.55em] text-[#8C7A6B] font-bold mb-6">Signature Works</p>
          <h1 className="text-5xl md:text-7xl font-serif leading-tight mb-6 whitespace-pre-line">{content?.portfolioHeaderTitle || 'A Gallery of\nMasterpieces'}</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">{content?.portfolioHeaderSubtitle || 'Curated luxury spaces designed for Nigeria\'s most discerning clientele.'}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 md:py-32">
        <div className="mb-24 md:mb-40 reveal group cursor-pointer" onClick={() => navigate('project-detail', featured)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-12 items-center">
            <div className="lg:col-span-7 relative h-[320px] md:h-[580px] lg:h-[720px] overflow-hidden rounded-sm shadow-2xl">
              {featured.mediaType === 'youtube' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Video className="text-white ml-1" size={28} />
                  </div>
                </div>
              )}
              <img
                src={featured.mediaType === 'youtube' ? `https://img.youtube.com/vi/${getYouTubeId(featured.mediaUrl)}/maxresdefault.jpg` : featured.mediaUrl}
                alt={featured.title} fetchPriority="high"
                className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105"
                onError={imgError}
              />
            </div>
            <div className="lg:col-span-5 lg:-ml-14 relative z-20 mt-[-28px] lg:mt-0 mx-4 lg:mx-0">
              <div className="bg-white p-8 md:p-12 shadow-xl lg:shadow-none rounded-b-lg lg:rounded-none">
                <p className="text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-4">Latest Masterpiece</p>
                <h2 className="text-3xl md:text-5xl font-serif mb-4 group-hover:text-[#8C7A6B] transition-colors duration-300 leading-tight">{featured.title}</h2>
                {featured.location && <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-6 pb-6 border-b border-gray-100">{featured.location}</p>}
                <p className="text-gray-600 leading-loose text-sm md:text-base mb-8 line-clamp-4">{featured.desc}</p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1 group-hover:text-[#8C7A6B] group-hover:border-[#8C7A6B] transition-colors duration-300">
                  Explore Project <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-24 md:space-y-40">
          {rest.map((p, idx) => (
            <div key={p.id} className={`reveal group flex flex-col ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-20 items-center cursor-pointer`} onClick={() => navigate('project-detail', p)}>
              <div className="w-full lg:w-3/5 overflow-hidden rounded-sm shadow-lg aspect-[4/3] lg:aspect-auto lg:h-[520px] relative">
                {p.mediaType === 'youtube' && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                      <Video className="text-white ml-1" size={22} />
                    </div>
                  </div>
                )}
                <img src={p.mediaType === 'youtube' ? `https://img.youtube.com/vi/${getYouTubeId(p.mediaUrl)}/hqdefault.jpg` : p.mediaUrl} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105" onError={imgError} />
              </div>
              <div className="w-full lg:w-2/5">
                <p className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold mb-3 border-l-2 border-[#8C7A6B] pl-4">{p.location || 'Interior Architecture'}</p>
                <h3 className="text-3xl md:text-4xl font-serif mb-5 group-hover:text-[#8C7A6B] transition-colors duration-300">{p.title}</h3>
                <p className="text-gray-600 text-sm md:text-base leading-loose mb-8 line-clamp-4">{p.desc}</p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-0.5 group-hover:text-[#8C7A6B] group-hover:border-[#8C7A6B] transition-colors duration-300">
                  View Case Study <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal mt-24 md:mt-40 text-center py-20 border-t border-gray-100">
          <p className="text-[9px] uppercase tracking-[0.5em] text-[#8C7A6B] font-bold mb-4">Commission Your Space</p>
          <h2 className="text-4xl md:text-5xl font-serif mb-6">Your Space Awaits<br />Its Transformation</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-10 leading-relaxed text-sm">Join our portfolio of luxury spaces crafted for Nigeria's most discerning clientele.</p>
          <button onClick={() => navigate('contact')} className="px-12 py-5 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.35em] font-bold hover:bg-[#8C7A6B] transition-all duration-300">
            Start Your Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROJECT DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════
function ProjectDetailView({ project, navigate }: { project: Project | null; navigate: any }) {
  if (!project) return <div className="py-48 text-center text-gray-500">Project not found.</div>;

  const ytId      = getYouTubeId(project.mediaUrl);
  const isPortrait = project.videoOrientation === 'portrait';

  return (
    <div className="bg-white pb-20 md:pb-32">
      {/* Full-screen hero */}
      <header className="relative h-[70vh] md:h-[90vh] bg-[#111111] overflow-hidden">
        {project.mediaType === 'youtube' && ytId ? (
          <div className="absolute inset-0 opacity-60">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}`}
              title={project.title}
              className="w-full h-full pointer-events-none"
              style={{ border: 'none' }}
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <img src={project.mediaUrl} alt={project.title} fetchPriority="high" className="w-full h-full object-cover opacity-75" onError={imgError} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/85 flex flex-col justify-end px-6 md:px-16 pb-12 md:pb-24 pt-[88px]">
          <div className="max-w-5xl">
            <button onClick={() => navigate('portfolio')} className="inline-flex items-center gap-2 mb-6 md:mb-10 text-white/80 hover:text-white text-[9px] uppercase tracking-[0.35em] font-bold transition-colors bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-full border border-white/20">
              ← Back to Portfolio
            </button>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif text-white mb-4 leading-tight drop-shadow-lg">{project.title}</h1>
            <p className="text-white/80 text-lg max-w-2xl leading-relaxed hidden sm:block">{project.desc}</p>
          </div>
        </div>
      </header>

      {/* Meta bar */}
      <div className="bg-[#111111] text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-8 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-800">
            {[{ l: 'Location', v: project.location || 'Undisclosed', a: false }, { l: 'Category', v: project.category || 'Interior Architecture', a: false }, { l: 'Year', v: project.year || '2024', a: false }, { l: 'Status', v: 'Completed', a: true }].map((item, i) => (
              <div key={i} className={`${i > 0 ? 'pl-6' : ''} pr-6`}>
                <p className="text-gray-400 text-[9px] uppercase tracking-widest mb-2 font-semibold">{item.l}</p>
                <p className={`font-serif text-sm md:text-base ${item.a ? 'text-[#8C7A6B]' : 'text-white'}`}>{item.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case study text */}
      <div className="max-w-7xl mx-auto px-6 md:px-14 py-16 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-32">
          <div className="reveal">
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-6 flex items-center gap-4">
              <span className="w-8 h-px bg-[#8C7A6B]" /> The Challenge
            </p>
            <p className="text-gray-700 leading-loose text-lg md:text-xl font-light">{project.problem}</p>
          </div>
          <div className="reveal reveal-delay-1">
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-6 flex items-center gap-4">
              <span className="w-8 h-px bg-[#8C7A6B]" /> The Execution
            </p>
            <p className="text-gray-700 leading-loose text-lg md:text-xl font-light">{project.solution}</p>
          </div>
        </div>
      </div>

      {/* YouTube embed with correct orientation */}
      {project.mediaType === 'youtube' && ytId && (
        <div className="max-w-7xl mx-auto px-6 md:px-14 mb-16">
          <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-10 flex items-center justify-center gap-4">
            <span className="w-8 h-px bg-[#8C7A6B]" /> Project Video <span className="w-8 h-px bg-[#8C7A6B]" />
          </p>
          <div className={`reveal mx-auto overflow-hidden rounded-2xl shadow-2xl ${isPortrait ? 'max-w-xs' : 'w-full'}`}
            style={{ aspectRatio: isPortrait ? '9/16' : '16/9' }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?controls=1&rel=0&modestbranding=1`}
              title={project.title}
              className="w-full h-full"
              style={{ border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Gallery */}
      {project.gallery && project.gallery.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <p className="reveal text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-10 flex items-center justify-center gap-4">
            <span className="w-8 h-px bg-[#8C7A6B]" /> Project Gallery <span className="w-8 h-px bg-[#8C7A6B]" />
          </p>
          <div className="columns-1 sm:columns-2 gap-4 space-y-4">
            {project.gallery.map((item) => {
              const ytId = getYouTubeId(item.url);
              const isVideoFile = item.url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
              
              return (
                <div key={item.id} className="reveal break-inside-avoid overflow-hidden rounded-xl bg-gray-50 border border-gray-100 shadow-sm group relative">
                  {ytId ? (
                    <div className="aspect-video w-full overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?controls=1&rel=0`}
                        title="Gallery Video"
                        className="w-full h-full"
                        style={{ border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : isVideoFile ? (
                    <div className="aspect-video w-full overflow-hidden">
                      <video
                        src={item.url}
                        controls
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={`${project.title} — Gallery`}
                      loading="lazy"
                      className="w-full hover:scale-[1.02] transition-transform duration-700"
                      onError={imgError}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONTACT VIEW
// ═══════════════════════════════════════════════════════════════════════════
function ContactView({ content }: { content: SiteContent }) {
  const [form,      setForm]      = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending,   setSending]   = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contact', ...form }).toString(),
      });
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', message: '' });
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      alert('Something went wrong. Please contact us directly.');
    } finally { setSending(false); }
  };

  const lineInput  = "w-full py-4 bg-transparent border-0 border-b border-gray-300 focus:border-[#8C7A6B] focus:outline-none transition-colors placeholder-gray-400 text-[#1A1A1A] text-base";
  const labelClass = "block text-[9px] uppercase tracking-[0.4em] font-bold text-gray-500 mb-2";

  return (
    <div>
      <section className="bg-[#111111] text-white pt-[110px] pb-20 md:pt-[148px] md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '44px 44px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-[9px] uppercase tracking-[0.55em] text-[#8C7A6B] font-bold mb-6">Get in Touch</p>
          <h1 className="text-5xl md:text-7xl font-serif leading-tight mb-6 whitespace-pre-line">{content?.contactHeaderTitle || 'Let\'s Build\nSomething Beautiful'}</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">{content?.contactHeaderSubtitle || 'Whether you have a clear vision or need creative direction, we\'re ready to bring your dream space to life.'}</p>
        </div>
      </section>

      <section className="py-20 md:py-32 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28">
          <div className="reveal">
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-10">Send a Message</p>
            {submitted ? (
              <div className="text-center py-20 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#8C7A6B]/10 flex items-center justify-center mb-4">
                  <CheckCircle size={36} className="text-[#8C7A6B]" />
                </div>
                <h3 className="text-3xl font-serif">Message Received</h3>
                <p className="text-gray-500 max-w-xs leading-relaxed text-sm">Thank you for reaching out. A member of our team will respond shortly.</p>
                <button onClick={() => setSubmitted(false)} className="mt-4 text-[10px] uppercase tracking-widest font-bold text-[#8C7A6B] hover:text-[#736356] transition-colors">Send Another</button>
              </div>
            ) : (
              <form name="contact" method="POST" data-netlify="true" onSubmit={handleSubmit} className="space-y-8">
                <input type="hidden" name="form-name" value="contact" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><label className={labelClass}>Full Name</label><input type="text" name="name" required value={form.name} onChange={set('name')} className={lineInput} placeholder="Your full name" /></div>
                  <div><label className={labelClass}>Email Address</label><input type="email" name="email" required value={form.email} onChange={set('email')} className={lineInput} placeholder="your@email.com" /></div>
                </div>
                <div><label className={labelClass}>Phone Number</label><input type="tel" name="phone" value={form.phone} onChange={set('phone')} className={lineInput} placeholder="+234 XXX XXXX XXX" /></div>
                <div><label className={labelClass}>Tell Us About Your Project</label><textarea name="message" required rows={5} value={form.message} onChange={set('message')} className={`${lineInput} resize-none`} placeholder="Describe your space, vision, and timeline…" /></div>
                <button type="submit" disabled={sending} className="w-full py-5 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.35em] font-bold hover:bg-[#8C7A6B] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                  {sending ? 'Sending…' : 'Send Inquiry'}
                </button>
              </form>
            )}
          </div>

          <div className="reveal reveal-delay-1 flex flex-col gap-10">
            <div>
              <p className="text-[9px] uppercase tracking-[0.45em] text-[#8C7A6B] font-bold mb-10">Contact Details</p>
              <div className="space-y-8">
                {content?.contactPhone && (
                  <div className="flex items-start gap-5">
                    <div className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-[#8C7A6B] shrink-0"><Phone size={16} /></div>
                    <div><p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Call Us</p><a href={`tel:${content.contactPhone}`} className="text-lg font-medium hover:text-[#8C7A6B] transition-colors">{content.contactPhone}</a></div>
                  </div>
                )}
                {content?.contactEmail && (
                  <div className="flex items-start gap-5">
                    <div className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-[#8C7A6B] shrink-0"><Mail size={16} /></div>
                    <div><p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Email Us</p><a href={`mailto:${content.contactEmail}`} className="text-lg font-medium hover:text-[#8C7A6B] transition-colors break-all">{content.contactEmail}</a></div>
                  </div>
                )}
                {content?.contactInstagram && (
                  <div className="flex items-start gap-5">
                    <div className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-[#8C7A6B] shrink-0"><Instagram size={16} /></div>
                    <div><p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Follow Us</p><a href={content.contactInstagram} target="_blank" rel="noopener noreferrer" className="text-lg font-medium hover:text-[#8C7A6B] transition-colors">@kelvinarmani_official</a></div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative bg-[#111111] rounded-2xl p-8 md:p-10 text-white overflow-hidden mt-auto">
              <div className="absolute inset-0 opacity-15">
                <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=800" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="relative z-10">
                <Instagram size={26} className="text-[#8C7A6B] mb-4" />
                <h4 className="text-2xl font-serif mb-2">Follow Our Journey</h4>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">Behind-the-scenes content, design inspiration, and our latest completed projects.</p>
                {content?.contactInstagram && (
                  <a href={content.contactInstagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1A1A1A] text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-[#8C7A6B] hover:text-white transition-colors rounded-full">
                    <Instagram size={13} /> Follow Now
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════════════════
function AdminLogin({ setIsAdminAuth }: { setIsAdminAuth: (v: boolean) => void }) {
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) setIsAdminAuth(true);
    else { setError('Invalid PIN. Please try again.'); setPin(''); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-[#FAF9F7]">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto mb-8">
          <Lock size={22} className="text-[#8C7A6B]" />
        </div>
        <h2 className="text-3xl font-serif mb-2">Admin Access</h2>
        <p className="text-gray-500 text-sm mb-10">Enter your 4-digit security PIN to continue.</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password" value={pin} autoFocus maxLength={4}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            className="w-full text-center text-3xl tracking-[1em] px-4 py-5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#8C7A6B] transition-all"
            placeholder="••••"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full py-4 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-[0.35em] font-bold hover:bg-[#8C7A6B] transition-colors rounded-xl">
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function AdminDashboard({ content, setContent, services, setServices, projects, setProjects, ongoingProjects, setOngoingProjects, testimonials, setTestimonials, teamMembers, setTeamMembers, setIsAdminAuth }: any) {
  const [tab, setTab] = useState('home');

  const TABS = [
    { id: 'home',         label: 'Home Section' },
    { id: 'about',        label: 'About' },
    { id: 'services',     label: 'Services' },
    { id: 'projects',     label: 'Projects' },
    { id: 'ongoing',      label: 'Ongoing' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'team',         label: 'Team' },
    { id: 'headers',      label: 'Page Titles' },
    { id: 'contact',      label: 'Contact' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-screen bg-[#FAF9F7]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-serif">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Edit every section of your website in real-time.</p>
        </div>
        <button onClick={() => setIsAdminAuth(false)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
          <LogOut size={15} /> Logout
        </button>
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-0 mb-0 hide-scrollbar">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: 'auto' }); }}
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl whitespace-nowrap transition-colors shrink-0 ${tab === id ? 'bg-white text-[#1A1A1A] border border-gray-100 border-b-white relative z-10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 md:p-10 border border-gray-100 rounded-b-2xl rounded-tr-2xl shadow-sm min-h-[500px]">
        {tab === 'home'         && <AdminHomeTab        content={content}        setContent={setContent} />}
        {tab === 'about'        && <AdminAboutTab       content={content}        setContent={setContent} />}
        {tab === 'services'     && <AdminCollectionTab  collectionName="services"     items={services}     setItems={setServices}
          defaultItem={{ title: '', desc: '', detailedDesc: '', price: '', image: '' }}
          fields={[{ key: 'title', label: 'Title' }, { key: 'desc', label: 'Short Description', type: 'textarea' }, { key: 'detailedDesc', label: 'Detailed Description (shown in modal)', type: 'textarea' }, { key: 'price', label: 'Pricing' }, { key: 'image', label: 'Service Image', type: 'image' }]}
        />}
        {tab === 'projects'     && <AdminProjectsTab   projects={projects}     setProjects={setProjects} />}
        {tab === 'ongoing'      && <AdminCollectionTab  collectionName="ongoingProjects" items={ongoingProjects} setItems={setOngoingProjects}
          defaultItem={{ title: '', desc: '', image: '', progress: '0%' }}
          fields={[{ key: 'title', label: 'Project Title' }, { key: 'desc', label: 'Short Description', type: 'textarea' }, { key: 'progress', label: 'Progress (e.g. 75%)' }, { key: 'image', label: 'Cover Image', type: 'image' }]}
        />}
        {tab === 'testimonials' && <AdminCollectionTab  collectionName="testimonials" items={testimonials} setItems={setTestimonials}
          defaultItem={{ name: '', location: '', text: '', image: '' }}
          fields={[{ key: 'name', label: 'Client Name' }, { key: 'location', label: 'Location / City' }, { key: 'text', label: 'Testimonial Quote', type: 'textarea' }, { key: 'image', label: 'Client Photo', type: 'image' }]}
        />}
        {tab === 'team'         && <AdminCollectionTab  collectionName="teamMembers" items={teamMembers} setItems={setTeamMembers}
          defaultItem={{ name: '', role: '', bio: '', image: '' }}
          fields={[{ key: 'name', label: 'Full Name' }, { key: 'role', label: 'Role / Title' }, { key: 'bio', label: 'Short Bio', type: 'textarea' }, { key: 'image', label: 'Profile Photo', type: 'image' }]}
        />}
        {tab === 'headers'      && <AdminTitlesTab      content={content}        setContent={setContent} />}
        {tab === 'contact'      && <AdminContactTab     content={content}        setContent={setContent} />}
      </div>
    </div>
  );
}

// ─── Admin: Home Tab ───────────────────────────────────────────────────────
function AdminHomeTab({ content, setContent }: any) {
  const [draft,  setDraft]  = useState({ ...content });
  const [saving, setSaving] = useState(false);

  // Sync draft if content changes from DB
  useEffect(() => {
    if (content) setDraft({ ...content });
  }, [content]);

  const save = async () => {
    if (!_db) return alert('Firebase not connected.');
    setSaving(true);
    try {
      await setDoc(doc(_db, 'websiteContent', 'main'), { ...content, ...draft });
      setContent((c: any) => ({ ...c, ...draft }));
      window.scrollTo({ top: 0, behavior: 'auto' });
      alert('Saved!');
    }
    catch (e) { console.error(e); alert('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-serif border-b border-gray-100 pb-4">Home Section — Hero Banner</h2>
        <div className="space-y-5 mt-4">
          <div><label className={labelCls}>Hero Headline</label><input value={draft.heroHeadline || ''} onChange={(e) => setDraft({ ...draft, heroHeadline: e.target.value })} className={inputCls} placeholder="Kelvin Armani Interiors and Painting Enterprise" /></div>
          <div><label className={labelCls}>Hero Subtitle / Description</label><textarea rows={3} value={draft.heroSub || ''} onChange={(e) => setDraft({ ...draft, heroSub: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Hero Top Tagline</label><input value={draft.heroTagline || ''} onChange={(e) => setDraft({ ...draft, heroTagline: e.target.value })} className={inputCls} placeholder="Luxury · Precision · Excellence" /></div>
          <ImageUploader label="Hero Background Image" currentUrl={draft.heroImage} onUpload={(url) => setDraft({ ...draft, heroImage: url })} />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-150">
        <h2 className="text-xl font-serif border-b border-gray-100 pb-4">Home Section — Design Philosophy</h2>
        <div className="space-y-5 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className={labelCls}>Philosophy Subtitle</label><input value={draft.philSubtitle || ''} onChange={(e) => setDraft({ ...draft, philSubtitle: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Philosophy Title</label><input value={draft.philTitle || ''} onChange={(e) => setDraft({ ...draft, philTitle: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Philosophy Description</label><textarea rows={3} value={draft.philDesc || ''} onChange={(e) => setDraft({ ...draft, philDesc: e.target.value })} className={inputCls} /></div>
          <div className="space-y-4">
            <label className={labelCls}>Philosophy Section Images</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ImageUploader label="Main Image (Left / Top on Mobile)" currentUrl={draft.philImg1 || ''} onUpload={(url) => setDraft({ ...draft, philImg1: url })} />
              <ImageUploader label="Image 2 (Top Right / Middle on Mobile)" currentUrl={draft.philImg2 || ''} onUpload={(url) => setDraft({ ...draft, philImg2: url })} />
              <ImageUploader label="Image 3 (Bottom Right / Bottom on Mobile)" currentUrl={draft.philImg3 || ''} onUpload={(url) => setDraft({ ...draft, philImg3: url })} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-150">
        <h2 className="text-xl font-serif border-b border-gray-100 pb-4">Home Section — Stats Counter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mt-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className={labelCls}>Stat 1 Number</label>
            <input value={draft.stat1Num || ''} onChange={(e) => setDraft({ ...draft, stat1Num: e.target.value })} className={inputCls} placeholder="50+" />
            <label className={`${labelCls} mt-2`}>Stat 1 Label</label>
            <input value={draft.stat1Label || ''} onChange={(e) => setDraft({ ...draft, stat1Label: e.target.value })} className={inputCls} placeholder="Projects Completed" />
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className={labelCls}>Stat 2 Number</label>
            <input value={draft.stat2Num || ''} onChange={(e) => setDraft({ ...draft, stat2Num: e.target.value })} className={inputCls} placeholder="8+" />
            <label className={`${labelCls} mt-2`}>Stat 2 Label</label>
            <input value={draft.stat2Label || ''} onChange={(e) => setDraft({ ...draft, stat2Label: e.target.value })} className={inputCls} placeholder="Years of Excellence" />
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className={labelCls}>Stat 3 Number</label>
            <input value={draft.stat3Num || ''} onChange={(e) => setDraft({ ...draft, stat3Num: e.target.value })} className={inputCls} placeholder="3" />
            <label className={`${labelCls} mt-2`}>Stat 3 Label</label>
            <input value={draft.stat3Label || ''} onChange={(e) => setDraft({ ...draft, stat3Label: e.target.value })} className={inputCls} placeholder="Cities Served" />
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className={labelCls}>Stat 4 Number</label>
            <input value={draft.stat4Num || ''} onChange={(e) => setDraft({ ...draft, stat4Num: e.target.value })} className={inputCls} placeholder="100%" />
            <label className={`${labelCls} mt-2`}>Stat 4 Label</label>
            <input value={draft.stat4Label || ''} onChange={(e) => setDraft({ ...draft, stat4Label: e.target.value })} className={inputCls} placeholder="Client Satisfaction" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-150">
        <h2 className="text-xl font-serif border-b border-gray-100 pb-4">Home Section — Call to Action (CTA)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <div><label className={labelCls}>CTA Title</label><textarea rows={2} value={draft.ctaTitle || ''} onChange={(e) => setDraft({ ...draft, ctaTitle: e.target.value })} className={inputCls} placeholder="Your Dream Space\nAwaits" /></div>
          <div><label className={labelCls}>CTA Description</label><textarea rows={2} value={draft.ctaDesc || ''} onChange={(e) => setDraft({ ...draft, ctaDesc: e.target.value })} className={inputCls} /></div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <SaveButton saving={saving} onClick={save} />
      </div>
    </div>
  );
}

// ─── Admin: About Tab ──────────────────────────────────────────────────────
function AdminAboutTab({ content, setContent }: any) {
  const [draft,  setDraft]  = useState({ ...content });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!_db) return alert('Firebase not connected.');
    setSaving(true);
    try {
      await setDoc(doc(_db, 'websiteContent', 'main'), { ...content, ...draft });
      setContent((c: any) => ({ ...c, ...draft }));
      window.scrollTo({ top: 0, behavior: 'auto' });
      alert('Saved!');
    }
    catch (e) { console.error(e); alert('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-serif border-b border-gray-100 pb-4">About Page</h2>
      <div><label className={labelCls}>About Text</label><textarea rows={8} value={draft.aboutText} onChange={(e) => setDraft({ ...draft, aboutText: e.target.value })} className={inputCls} /></div>
      <ImageUploader label="About Page Image" currentUrl={draft.aboutImage} onUpload={(url) => setDraft({ ...draft, aboutImage: url })} />
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <SaveButton saving={saving} onClick={save} />
      </div>
    </div>
  );
}

// ─── Admin: Contact Tab ────────────────────────────────────────────────────
function AdminContactTab({ content, setContent }: any) {
  const [draft,  setDraft]  = useState({ ...content });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!_db) return alert('Firebase not connected.');
    setSaving(true);
    try {
      await setDoc(doc(_db, 'websiteContent', 'main'), { ...content, ...draft });
      setContent((c: any) => ({ ...c, ...draft }));
      window.scrollTo({ top: 0, behavior: 'auto' });
      alert('Saved!');
    }
    catch (e) { console.error(e); alert('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-serif border-b border-gray-100 pb-4">Contact Info</h2>
      <div><label className={labelCls}>Brand Name</label><input value={draft.brandName} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} className={inputCls} /></div>
      <div><label className={labelCls}>Phone Number</label><input type="tel" value={draft.contactPhone} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} className={inputCls} placeholder="+234..." /></div>
      <div><label className={labelCls}>Email Address</label><input type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} className={inputCls} /></div>
      <div><label className={labelCls}>Instagram URL</label><input type="url" value={draft.contactInstagram} onChange={(e) => setDraft({ ...draft, contactInstagram: e.target.value })} className={inputCls} placeholder="https://instagram.com/..." /></div>
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <SaveButton saving={saving} onClick={save} />
      </div>
    </div>
  );
}



// ─── Admin: Titles & Texts Tab ─────────────────────────────────────────────
function AdminTitlesTab({ content, setContent }: any) {
  const [draft,  setDraft]  = useState({ ...content });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!_db) return alert('Firebase not connected.');
    setSaving(true);
    try {
      await setDoc(doc(_db, 'websiteContent', 'main'), { ...content, ...draft });
      setContent((c: any) => ({ ...c, ...draft }));
      window.scrollTo({ top: 0, behavior: 'auto' });
      alert('Saved!');
    } catch (e) {
      console.error(e);
      alert('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-serif border-b border-gray-100 pb-4">Page Headers, Titles & Principles</h2>
      
      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
        <h3 className="font-serif text-base text-[#8C7A6B]">Hero Section</h3>
        <div><label className={labelCls}>Hero Top Tagline</label><input value={draft.heroTagline || ''} onChange={(e) => setDraft({ ...draft, heroTagline: e.target.value })} className={inputCls} /></div>
      </div>

      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
        <h3 className="font-serif text-base text-[#8C7A6B]">About Page Header & Principles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelCls}>About Header Title</label><input value={draft.aboutHeaderTitle || ''} onChange={(e) => setDraft({ ...draft, aboutHeaderTitle: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>About Header Subtitle</label><input value={draft.aboutHeaderSubtitle || ''} onChange={(e) => setDraft({ ...draft, aboutHeaderSubtitle: e.target.value })} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelCls}>About Years counter Number</label><input value={draft.aboutYearsNum || ''} onChange={(e) => setDraft({ ...draft, aboutYearsNum: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>About Years counter Label</label><input value={draft.aboutYearsLabel || ''} onChange={(e) => setDraft({ ...draft, aboutYearsLabel: e.target.value })} className={inputCls} /></div>
        </div>
        
        <h4 className="font-serif text-sm border-t border-gray-200 pt-3">Core Principles</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white rounded-lg border border-gray-150">
            <label className={labelCls}>Principle 1 Title</label>
            <input value={draft.principle1Title || ''} onChange={(e) => setDraft({ ...draft, principle1Title: e.target.value })} className={inputCls} />
            <label className={`${labelCls} mt-2`}>Principle 1 Description</label>
            <textarea rows={3} value={draft.principle1Desc || ''} onChange={(e) => setDraft({ ...draft, principle1Desc: e.target.value })} className={inputCls} />
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-150">
            <label className={labelCls}>Principle 2 Title</label>
            <input value={draft.principle2Title || ''} onChange={(e) => setDraft({ ...draft, principle2Title: e.target.value })} className={inputCls} />
            <label className={`${labelCls} mt-2`}>Principle 2 Description</label>
            <textarea rows={3} value={draft.principle2Desc || ''} onChange={(e) => setDraft({ ...draft, principle2Desc: e.target.value })} className={inputCls} />
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-150">
            <label className={labelCls}>Principle 3 Title</label>
            <input value={draft.principle3Title || ''} onChange={(e) => setDraft({ ...draft, principle3Title: e.target.value })} className={inputCls} />
            <label className={`${labelCls} mt-2`}>Principle 3 Description</label>
            <textarea rows={3} value={draft.principle3Desc || ''} onChange={(e) => setDraft({ ...draft, principle3Desc: e.target.value })} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
        <h3 className="font-serif text-base text-[#8C7A6B]">Services Page Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelCls}>Services Header Title</label><input value={draft.servicesHeaderTitle || ''} onChange={(e) => setDraft({ ...draft, servicesHeaderTitle: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Services Header Subtitle</label><input value={draft.servicesHeaderSubtitle || ''} onChange={(e) => setDraft({ ...draft, servicesHeaderSubtitle: e.target.value })} className={inputCls} /></div>
        </div>
      </div>

      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
        <h3 className="font-serif text-base text-[#8C7A6B]">Portfolio Page Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelCls}>Portfolio Header Title</label><input value={draft.portfolioHeaderTitle || ''} onChange={(e) => setDraft({ ...draft, portfolioHeaderTitle: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Portfolio Header Subtitle</label><input value={draft.portfolioHeaderSubtitle || ''} onChange={(e) => setDraft({ ...draft, portfolioHeaderSubtitle: e.target.value })} className={inputCls} /></div>
        </div>
      </div>

      <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
        <h3 className="font-serif text-base text-[#8C7A6B]">Contact Page Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelCls}>Contact Header Title</label><input value={draft.contactHeaderTitle || ''} onChange={(e) => setDraft({ ...draft, contactHeaderTitle: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Contact Header Subtitle</label><input value={draft.contactHeaderSubtitle || ''} onChange={(e) => setDraft({ ...draft, contactHeaderSubtitle: e.target.value })} className={inputCls} /></div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <SaveButton saving={saving} onClick={save} />
      </div>
    </div>
  );
}

// ─── Admin: Projects Tab (custom — has youtube + gallery) ──────────────────
function AdminProjectsTab({ projects, setProjects }: any) {
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving,  setSaving]  = useState(false);

  const defaultProject: Project = { id: 0, title: '', location: '', category: '', year: '', desc: '', problem: '', solution: '', mediaType: 'image', mediaUrl: '', videoOrientation: 'landscape', gallery: [] };

  const save = async (item: Project) => {
    if (!_db) return alert('Firebase not connected.');
    const id = item.id || Date.now();
    setSaving(true);
    try {
      await setDoc(doc(_db, 'projects', id.toString()), { ...item, id });
      setEditing(null);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    catch (e) { console.error(e); alert('Error saving.'); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!_db || !window.confirm('Delete this project?')) return;
    try { await deleteDoc(doc(_db, 'projects', id.toString())); }
    catch (e) { console.error(e); alert('Error deleting.'); }
  };

  const addGalleryItem = (url: string) => {
    if (!editing || !url.trim()) return;
    const isYt = getYouTubeId(url);
    const isVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
    const type = isYt ? 'youtube' : (isVideo ? 'video' : 'image');
    setEditing({ ...editing, gallery: [...(editing.gallery || []), { id: Date.now(), type, url }] });
  };

  const removeGalleryImage = (imgId: number) => {
    if (!editing) return;
    setEditing({ ...editing, gallery: editing.gallery.filter((g) => g.id !== imgId) });
  };

  if (editing) {
    return (
      <div className="space-y-7">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h3 className="text-xl font-serif">{editing.id ? 'Edit Project' : 'Add New Project'}</h3>
          <button onClick={() => { setEditing(null); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className={labelCls}>Project Title</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Location</label><input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className={inputCls} placeholder="e.g. GRA, Benin City" /></div>
          <div><label className={labelCls}>Project Category</label><input value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls} placeholder="e.g. Interior Architecture" /></div>
          <div><label className={labelCls}>Year Done</label><input value={editing.year || ''} onChange={(e) => setEditing({ ...editing, year: e.target.value })} className={inputCls} placeholder="e.g. 2024" /></div>
        </div>
        <div><label className={labelCls}>Short Description</label><textarea rows={2} value={editing.desc} onChange={(e) => setEditing({ ...editing, desc: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>The Challenge (problem)</label><textarea rows={3} value={editing.problem} onChange={(e) => setEditing({ ...editing, problem: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>The Execution (solution)</label><textarea rows={3} value={editing.solution} onChange={(e) => setEditing({ ...editing, solution: e.target.value })} className={inputCls} /></div>

        {/* Media type toggle */}
        <div>
          <label className={labelCls}>Media Type</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing({ ...editing, mediaType: 'image' })} className={`px-5 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${editing.mediaType === 'image' ? 'bg-[#8C7A6B] text-white border-[#8C7A6B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              🖼 Image
            </button>
            <button type="button" onClick={() => setEditing({ ...editing, mediaType: 'youtube' })} className={`px-5 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${editing.mediaType === 'youtube' ? 'bg-[#8C7A6B] text-white border-[#8C7A6B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              ▶ YouTube Video
            </button>
          </div>
        </div>

        {editing.mediaType === 'image' ? (
          <ImageUploader label="Hero / Cover Image" currentUrl={editing.mediaUrl} onUpload={(url) => setEditing({ ...editing, mediaUrl: url })} />
        ) : (
          <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className={labelCls}>YouTube URL</label>
              <input
                type="url"
                value={editing.mediaUrl}
                onChange={(e) => setEditing({ ...editing, mediaUrl: e.target.value })}
                className={inputCls}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {getYouTubeId(editing.mediaUrl) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-semibold">
                  <CheckCircle size={14} /> Valid YouTube link detected: {getYouTubeId(editing.mediaUrl)}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Video Orientation</label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setEditing({ ...editing, videoOrientation: 'landscape' })}
                  className={`flex-1 py-3 text-sm font-semibold rounded-lg border transition-colors ${editing.videoOrientation !== 'portrait' ? 'bg-[#8C7A6B] text-white border-[#8C7A6B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  ⬛ Landscape (16:9)
                </button>
                <button type="button"
                  onClick={() => setEditing({ ...editing, videoOrientation: 'portrait' })}
                  className={`flex-1 py-3 text-sm font-semibold rounded-lg border transition-colors ${editing.videoOrientation === 'portrait' ? 'bg-[#8C7A6B] text-white border-[#8C7A6B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  ▬ Portrait (9:16)
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Choose Portrait for vertical/Shorts-style videos, Landscape for standard YouTube videos.</p>
            </div>
            {getYouTubeId(editing.mediaUrl) && (
              <div className={`overflow-hidden rounded-xl bg-black mx-auto ${editing.videoOrientation === 'portrait' ? 'max-w-[200px]' : 'w-full'}`} style={{ aspectRatio: editing.videoOrientation === 'portrait' ? '9/16' : '16/9' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(editing.mediaUrl)}?controls=1&rel=0`}
                  className="w-full h-full" style={{ border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title="Preview"
                />
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        <div>
          <label className={labelCls}>Gallery Items (Images & Videos)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {(editing.gallery || []).map((item) => {
              const ytId = getYouTubeId(item.url);
              const isVideoFile = item.url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
              return (
                <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {ytId ? (
                    <div className="w-full h-full relative">
                      <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" onError={imgError} />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Video size={20} className="text-white" /></div>
                    </div>
                  ) : isVideoFile ? (
                    <div className="w-full h-full relative">
                      <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Video size={20} className="text-white" /></div>
                    </div>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" onError={imgError} />
                  )}
                  <button onClick={() => removeGalleryImage(item.id)} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10">
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <p className="text-xs font-semibold text-gray-500">ADD TO GALLERY</p>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="w-full md:w-auto">
                <ImageUploader
                  label="Upload Image or Video File"
                  currentUrl=""
                  onUpload={(url) => { if (url) addGalleryItem(url); }}
                />
              </div>
              <div className="flex-1 w-full space-y-2 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-4">
                <label className={labelCls}>Or Paste YouTube / Video Link</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="newGalleryUrl"
                    placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#8C7A6B] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newGalleryUrl') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        addGalleryItem(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">You can upload image/video files, or paste links to YouTube videos or direct video files.</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button onClick={() => { setEditing(null); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={() => save(editing)} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#8C7A6B] text-white text-sm font-bold rounded-lg hover:bg-[#736356] transition-colors disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Project'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-serif">Manage Projects</h3>
        <button onClick={() => { setEditing(defaultProject); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#333] transition-colors">
          <Plus size={14} /> Add Project
        </button>
      </div>
      <div className="space-y-3">
        {projects.map((item: Project) => (
          <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                <img
                  src={item.mediaType === 'youtube' ? `https://img.youtube.com/vi/${getYouTubeId(item.mediaUrl)}/default.jpg` : item.mediaUrl}
                  alt="" className="w-full h-full object-cover" onError={imgError}
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400 truncate">{item.location}</p>
                  {item.mediaType === 'youtube' && <span className="text-[9px] bg-red-50 text-red-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">YouTube</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditing(item); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={15} /></button>
              <button onClick={() => del(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {projects.length === 0 && <EmptyState label="projects" />}
      </div>
    </div>
  );
}

// ─── Admin: Generic Collection Tab ────────────────────────────────────────
function AdminCollectionTab({ collectionName, items, setItems, defaultItem, fields }: {
  collectionName: string;
  items: any[];
  setItems: (v: any[]) => void;
  defaultItem: any;
  fields: { key: string; label: string; type?: 'text' | 'textarea' | 'image' }[];
}) {
  const [editing, setEditing] = useState<any>(null);
  const [saving,  setSaving]  = useState(false);

  const save = async (item: any) => {
    if (!_db) return alert('Firebase not connected.');
    const id = item.id || Date.now();
    setSaving(true);
    try {
      await setDoc(doc(_db, collectionName, id.toString()), { ...item, id });
      setEditing(null);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    catch (e) { console.error(e); alert('Error saving.'); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!_db || !window.confirm('Delete this item?')) return;
    try { await deleteDoc(doc(_db, collectionName, id.toString())); }
    catch (e) { console.error(e); alert('Error deleting.'); }
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h3 className="text-xl font-serif">{editing.id ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={() => { setEditing(null); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-5">
          {fields.map(({ key, label, type = 'text' }) =>
            type === 'image' ? (
              <ImageUploader key={key} label={label} currentUrl={editing[key] || ''} onUpload={(url) => setEditing({ ...editing, [key]: url })} />
            ) : type === 'textarea' ? (
              <div key={key}><label className={labelCls}>{label}</label><textarea rows={4} value={editing[key] || ''} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} className={inputCls} /></div>
            ) : (
              <div key={key}><label className={labelCls}>{label}</label><input type="text" value={editing[key] || ''} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} className={inputCls} /></div>
            )
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button onClick={() => { setEditing(null); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={() => save(editing)} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#8C7A6B] text-white text-sm font-bold rounded-lg hover:bg-[#736356] transition-colors disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Item'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-serif capitalize">Manage {collectionName.replace(/([A-Z])/g, ' $1')}</h3>
        <button onClick={() => { setEditing({ ...defaultItem }); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#333] transition-colors">
          <Plus size={14} /> Add New
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const imageField = fields.find(f => f.type === 'image');
          const titleField = fields[0];
          const subField   = fields[1];
          return (
            <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {imageField && (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-100">
                    <img src={item[imageField.key] || PLACEHOLDER} alt="" className="w-full h-full object-cover" onError={imgError} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{item[titleField.key]}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{subField ? (item[subField.key] || '').slice(0, 60) : ''}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditing({ ...item }); window.scrollTo({ top: 0, behavior: 'auto' }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={15} /></button>
                <button onClick={() => del(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <EmptyState label={collectionName} />}
      </div>
    </div>
  );
}

// ─── Shared Admin Helpers ─────────────────────────────────────────────────
function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving} className="flex items-center gap-2 px-8 py-3.5 bg-[#8C7A6B] text-white text-sm font-bold rounded-lg hover:bg-[#736356] transition-colors disabled:opacity-50">
      <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-center text-gray-400 py-10 text-sm border-2 border-dashed border-gray-200 rounded-xl">
      No {label} yet — add your first one above.
    </p>
  );
}
