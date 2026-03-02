// Library imports
import type React from "react";
import Image from "next/image";
import { StaticImageData } from "next/image";
import type { ComponentProps } from "react";
// Custom imports
import { cn } from "@/util/utils";
// Import the PNGs
import user from "./assets/user.png";
import female_1       from "./assets/female-1.png";
import female_1_large from "./assets/female-1_large.png";
import female_2       from "./assets/female-2.png";
import female_2_large from "./assets/female-2_large.png";
import female_3       from "./assets/female-3.png";
import female_3_large from "./assets/female-3_large.png";
import female_4       from "./assets/female-4.png";
import female_4_large from "./assets/female-4_large.png";
import female_5       from "./assets/female-5.png";
import female_5_large from "./assets/female-5_large.png";
import female_6       from "./assets/female-6.png";
import female_6_large from "./assets/female-6_large.png";
import female_7       from "./assets/female-7.png";
import female_7_large from "./assets/female-7_large.png";
import female_8       from "./assets/female-8.png";
import female_8_large from "./assets/female-8_large.png";
import female_9       from "./assets/female-9.png";
import female_9_large from "./assets/female-9_large.png";
import male_1         from "./assets/male-1.png";
import male_1_large   from "./assets/male-1_large.png";
import male_2         from "./assets/male-2.png";
import male_2_large   from "./assets/male-2_large.png";
import male_3         from "./assets/male-3.png";
import male_3_large   from "./assets/male-3_large.png";
import male_4         from "./assets/male-4.png";
import male_4_large   from "./assets/male-4_large.png";
import male_5         from "./assets/male-5.png";
import male_5_large   from "./assets/male-5_large.png";
import male_6         from "./assets/male-6.png";
import male_6_large   from "./assets/male-6_large.png";
import male_7         from "./assets/male-7.png";
import male_7_large   from "./assets/male-7_large.png";
import male_8         from "./assets/male-8.png";
import male_8_large   from "./assets/male-8_large.png";
import male_9         from "./assets/male-9.png";
import male_9_large   from "./assets/male-9_large.png";

// ----------------------------------------------- //
//        C   O   N   S   T   A   N   T   S        //
// ----------------------------------------------- //
const WIDTH  = 36;
const HEIGHT = WIDTH;

// ------------------------------- //
//        T   Y   P   E   S        //
// ------------------------------- //
type IconProps = Omit<ComponentProps<typeof Image>, "src" | "alt">;

type AvatarFactoryProps = {
    IconSmall : React.FC<IconProps>;
    IconLarge?: React.FC<IconProps>;
    background: string;
};

type AvatarComponentProps = {
    textColor?: string;
    name?     : string;
    size?     : number; 
};

export type AvatarComponent = React.FC<AvatarComponentProps> & {
    background: string;
};

// -------------------------------------------------------------------------- //
//      F   A   C   T   O   R   Y      F   U   N   C   T   I   O   N   S      //
// -------------------------------------------------------------------------- //
const iconFactory = (
    src: StaticImageData | string,
    alt: string
): React.FC<IconProps> => {
    const IconComponent = ({ className = "", ...props }: IconProps): React.ReactElement => (
        <Image src   ={src}
               alt   ={alt}
               width ={WIDTH}
               height={HEIGHT}
               className={`block ${className}`}
               {...props}
        />
    );
    IconComponent.displayName = `Icon(${alt})`;
    
    return IconComponent;
};

const avatarFactory = ({ IconSmall,
                         IconLarge,
                         background }: AvatarFactoryProps): AvatarComponent  => {
    const AvatarComponent: AvatarComponent  = ({ textColor, name, size = WIDTH }) => {
      // Choose large icon when requested size is greater than the base WIDTH
      const Icon = (size > WIDTH && IconLarge) ? IconLarge : IconSmall;
      const iconRenderSize = Math.round(size * 0.9);
      
      return (
        <div className={"flex flex-col items-center"}>
          <div className="rounded-full overflow-hidden flex items-center justify-center"
               style    ={{ backgroundColor: background,
                            width          : size,
                            height         : size
                         }}
          >
            <Icon className="object-cover rounded-full"
                  width    ={iconRenderSize}
                  height   ={iconRenderSize}
                  style    ={{ width: iconRenderSize, height: iconRenderSize }}
            />
          </div>
          {name && (
            <div className={cn("mt-1 px-2 py-0.5 rounded",
                               size > WIDTH ? "text-lg" : "text-xs",
                               textColor ?? "text-white")}
                 style    ={{ backgroundColor: background }}
            >
              {name}
            </div>
          )}
        </div>
      );
    };
    
    AvatarComponent.background = background; 
    return AvatarComponent;
};

const femaleIconsData = [
    { src: female_1, alt: "Female Person 1" },
    { src: female_2, alt: "Female Person 2" },
    { src: female_3, alt: "Female Person 3" },
    { src: female_4, alt: "Female Person 4" },
    { src: female_5, alt: "Female Person 5" },
    { src: female_6, alt: "Female Person 6" },
    { src: female_7, alt: "Female Person 7" },
    { src: female_8, alt: "Female Person 8" },
    { src: female_9, alt: "Female Person 9" }
];

const femaleLargeIconsData = [
    { src: female_1_large, alt: "Female Person 1" },
    { src: female_2_large, alt: "Female Person 2" },
    { src: female_3_large, alt: "Female Person 3" },
    { src: female_4_large, alt: "Female Person 4" },
    { src: female_5_large, alt: "Female Person 5" },
    { src: female_6_large, alt: "Female Person 6" },
    { src: female_7_large, alt: "Female Person 7" },
    { src: female_8_large, alt: "Female Person 8" },
    { src: female_9_large, alt: "Female Person 9" }
];

export const FEMALE_COLORS = [
    "#ec4899", // Pink
    "#d35400", // Pumpkin
    "#e3a7de", // Light Pink
    "#f39c12", // Orange
    "#8b5cf6", // Violet
    "#f43f5e", // Rose
    "#f39c12", // Orange
    "#ef4444", // Red
    "#14b8a6"  // Teal
];

export const MALE_COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#0ea5e9", // Sky Blue
    "#64748b", // Slate
    "#0891b2", // Cyan
    "#22c55e", // Green
    "#b39330", // Dark Yellow
    "#6366f1", // Indigo
    "#a3e635"  // Lime
];

const maleIconsData = [
    { src: male_1, alt: "Male Person 1" },
    { src: male_2, alt: "Male Person 2" },
    { src: male_3, alt: "Male Person 3" },
    { src: male_4, alt: "Male Person 4" },
    { src: male_5, alt: "Male Person 5" },
    { src: male_6, alt: "Male Person 6" },
    { src: male_7, alt: "Male Person 7" },
    { src: male_8, alt: "Male Person 8" },
    { src: male_9, alt: "Male Person 9" }
];
const maleLargeIconsData = [
    { src: male_1_large, alt: "Male Person 1" },
    { src: male_2_large, alt: "Male Person 2" },
    { src: male_3_large, alt: "Male Person 3" },
    { src: male_4_large, alt: "Male Person 4" },
    { src: male_5_large, alt: "Male Person 5" },
    { src: male_6_large, alt: "Male Person 6" },
    { src: male_7_large, alt: "Male Person 7" },
    { src: male_8_large, alt: "Male Person 8" },
    { src: male_9_large, alt: "Male Person 9" }
];

export const FemaleIcons      = femaleIconsData.map(({ src, alt }) => iconFactory(src, alt));
export const FemaleLargeIcons = femaleLargeIconsData.map(({ src, alt }) => iconFactory(src, alt));
export const MaleIcons        = maleIconsData.map(({ src, alt }) => iconFactory(src, alt));
export const MaleLargeIcons   = maleLargeIconsData.map(({ src, alt }) => iconFactory(src, alt));
export const UserIcon         = iconFactory(user, "User");

export const UserAvatar = avatarFactory({
    IconSmall : UserIcon,
    background: "#95a5a6" // Concrete
});

export const FemaleAvatars = FemaleIcons.map((IconSmall, index) =>
    avatarFactory({
      IconSmall : IconSmall,
      IconLarge : FemaleLargeIcons[index],
      background: FEMALE_COLORS[index],
    })
);

export const MaleAvatars = MaleIcons.map((IconSmall, index) =>
    avatarFactory({
      IconSmall : IconSmall,
      IconLarge : MaleLargeIcons[index],
      background: MALE_COLORS[index],
    })
);