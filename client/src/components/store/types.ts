import { User, Product } from "@shared/schema";

export interface ExtendedStoreSettings {
  themeColor?: string;
  accentColor?: string;
  welcomeMessage?: string;
  font?: string;
  headerLayout?: 'standard' | 'minimal' | 'hero' | 'cinematic';
  socialLinks?: { platform: string; url: string }[];
  isPublishingHouse?: boolean;
  // Publishing House specific
  teamMembers?: { name: string; role: string; avatarUrl: string }[];
  publishedAuthors?: { id: string; name: string; avatarUrl: string }[];
  // Mock data fields for new features
  achievements?: { id: string; title: string; icon: string; description: string }[];
  stats?: {
    followers: number;
    readers: number;
    sales: number;
    books: number;
    rating: number;
    reviews: number;
  };
}

export interface StoreProps {
  user: Partial<User> & Record<string, any>;
  settings: ExtendedStoreSettings;
  isOwnStore: boolean;
  themeColor: string;
  fontClass: string;
  onTabChange?: (tab: string) => void;
}
