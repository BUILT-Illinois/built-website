import type { EboardMember } from "../types/content";

// 2026–27 e-board, supplied by the RSO 2026-09-28.
//
// Per docs/aws-migration-plan.md §11 rule 3, this content is maintained by the
// RSO and must not be refreshed or invented by an implementer — only edited
// here when the RSO supplies updated values.
//
// `description` is intentionally empty where the member did not provide an
// introduction; `image` is omitted where no photo was supplied.
export const eboard: EboardMember[] = [
  {
    image: "/26-27-eboard/Steven.png",
    title: "President",
    name: "Steven Uruchima",
    email: "scu2@illinois.edu",
    description:
      "Hey everyone, I'm Steven and President of B[U]ILT! I'm a senior studying Computer Science from Chicago, IL. This year I'm looking forward to continue fostering, uplifting, and elevating our community by working closely with our members and community partners. In my free time I like running, hiking, taking photos, collecting smiskis, and being with friends and family. Always feel free to reach out!",
  },
  {
    image: "/26-27-eboard/Paloma.png",
    title: "Vice President",
    name: "Paloma Pichardo",
    email: "palomap3@illinois.edu",
    description:
      "Hi! I’m Paloma Pichardo and I’m a junior majoring in Computer Science and minoring in Business. I’m from Houston, Texas and am a huge fan of running and all-you-can-eat sushi. I’m excited to help foster community through B[U]ILT this year!",
  },
  {
    image: "/26-27-eboard/Owen.png",
    title: "Secretary",
    name: "Owen Funke",
    email: "ofunk2@illinois.edu",
    description: "",
  },
  {
    image: "/26-27-eboard/Leo.jpg",
    title: "Treasurer",
    name: "Leo Mandujano",
    email: "leom5@illinois.edu",
    description: "",
  },
  {
    image: "/26-27-eboard/Tyler.png",
    title: "Internal Director",
    name: "Tyler Ramsay",
    email: "trams4@illinois.edu",
    description: "",
  },
  {
    image: "/26-27-eboard/Kay.jpg",
    title: "Social Director",
    name: "Kay Rivera",
    email: "krive5@illinois.edu",
    description:
      "I'm a rising senior in Computer Science with a minor in Game Studies & Design. I'm very excited to be this year's social director, leading the social committee in planning fun events for B[U]ILT including collab events, Hispanic Heritage Month, Black History Month, Women's History Month, and other socializing opportunities. Outside of school, I love cooking, baking, reading, drawing, painting, and fitness. Slack me if you have any new social ideas or want to know how to get more involved in B[U]ILT!",
  },
  {
    // No photo supplied yet.
    title: "External Director",
    name: "Saniya Sanders",
    email: "saniyas3@illinois.edu",
    description: "",
  },
  {
    image: "/26-27-eboard/eduardo.jpg",
    title: "Infrastructure Director",
    name: "Eduardo Aranda",
    email: "earanda2@illinois.edu",
    description:
      "Hi, I am Eduardo Aranda a senior in Econometrics and Quantitative Economics with minors in Computer Science and Computer Engineering. I am the 26-27 Infrastructure chair and am excited to help develop B[U]ILT's technical skills!",
  },
  {
    image: "/26-27-eboard/Erick.png",
    title: "Outreach Director",
    name: "Erick Gutierrez",
    email: "egutie44@illinois.edu",
    description:
      "Hello, my name is Erick Gutierrez. I am a first-generation Sophomore student at UIUC majoring in Computer Science from Chicago, Illinois. I love to play sports, go to the gym, play Pokémon, and watch Anime. I'm super excited to be a part of B[U]ILT's mission in supporting underrepresented groups and fostering a tight-knit community. Feel free to reach out to me or say hi if you see me in person!",
  },
  {
    // No photo supplied yet.
    title: "Graduate Affairs Director",
    name: "Bridget Agyare",
    email: "bagyare2@illinois.edu",
    description:
      "Hi, I'm Bridget! I am a third-year PhD student in CS studying CS education. I enjoy spending time with my friends and family, watching YouTube and TV shows, and interior decorating. I am excited to foster community among graduate students in B[U]ILT this year!!",
  },
  {
    image: "/26-27-eboard/Esther.JPG",
    title: "Marketing Director",
    name: "Esther Valentin",
    email: "evale8@illinois.edu",
    description:
      "My name is Esther Valentin and I'm currently studying information science with a minor in health technology! My upbringing in Chicago has provided me with a rich passion for UI/UX Design, healthcare, and information systems and I am proud to represent B[U]ILT as this years marketing chair.",
  },
  {
    image: "/26-27-eboard/brasen.png",
    title: "Campus Relations Director",
    name: "Brasen Asiedu",
    email: "brasena2@illinois.edu",
    description:
      "Hi! I’m Brasen, a junior at UIUC pursuing Information Science with interests in data science, technology, and digital innovation. As B[U]ILT’s Campus Relations Director, I’m passionate about building connections across campus and creating opportunities for students to find community within tech. Outside of B[U]ILT, I’m involved in modeling, dance, and step, which allow me to explore my creative side. I love styling outfits, traveling, and trying new things, and I’m always excited to meet new people and explore new opportunities!",
  },
];
