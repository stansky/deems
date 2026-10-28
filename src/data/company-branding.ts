export type CompanyBrand = {
  logoPath: string;
  accent: string;
  websiteUrl: string;
  overview: string;
  pitch: string;
  sourceUrl: string;
  checkedAt: string;
};

// Copy is a short, source-backed company description. Pitch is a plain one-line
// explanation of the company, not a candidate pitch.
export const companyBranding: Record<string, CompanyBrand> = {
  sycamore: {
    logoPath: "/companies/sycamore.svg",
    accent: "#A3B34F",
    websiteUrl: "https://sycamore.so/",
    overview:
      "Sycamore builds enterprise AI software for operational workflows, with products for creating business process software and governing AI systems.",
    pitch:
      "Sycamore helps enterprises build and govern AI software that can carry out real operational work.",
    sourceUrl: "https://sycamore.so/press/",
    checkedAt: "2026-10-27",
  },
  tesla: {
    logoPath: "/companies/tesla.svg",
    accent: "#171A20",
    websiteUrl: "https://www.tesla.com/",
    overview:
      "Tesla makes electric vehicles and develops energy generation and storage products. Its vehicle software and charging network support its transportation business.",
    pitch:
      "Tesla builds electric vehicles and energy products, supported by software and charging infrastructure.",
    sourceUrl: "https://www.tesla.com/",
    checkedAt: "2026-10-27",
  },
  anthropic: {
    logoPath: "/companies/anthropic.svg",
    accent: "#D97757",
    websiteUrl: "https://www.anthropic.com/",
    overview:
      "Anthropic is an AI research and product company. Its stated mission is to build reliable, interpretable, and steerable AI systems.",
    pitch:
      "Anthropic researches and builds AI systems, including Claude, with a focus on making them reliable and steerable.",
    sourceUrl: "https://www.anthropic.com/company",
    checkedAt: "2026-10-27",
  },
  crunchyroll: {
    logoPath: "/companies/crunchyroll.png",
    accent: "#F47521",
    websiteUrl: "https://www.crunchyroll.com/",
    overview:
      "Crunchyroll serves anime fans through streaming, theatrical releases, events, games, music, and news, connecting anime creators and audiences.",
    pitch:
      "Crunchyroll brings anime to fans through streaming and a wider set of entertainment experiences.",
    sourceUrl:
      "https://www.crunchyroll.com/news/announcements/2024/7/18/crunchyroll-unveils-brand-evolution-ahead-of-san-diego-comic-con",
    checkedAt: "2026-10-27",
  },
  ollama: {
    logoPath: "/companies/ollama.png",
    accent: "#171717",
    websiteUrl: "https://ollama.com/",
    overview:
      "Ollama provides tools to run open models locally and access hosted models through its cloud service.",
    pitch:
      "Ollama makes it straightforward to run open models on your computer or use them through its cloud service.",
    sourceUrl: "https://ollama.com/",
    checkedAt: "2026-10-27",
  },
  adobe: {
    logoPath: "/companies/adobe.svg",
    accent: "#EB1000",
    websiteUrl: "https://www.adobe.com/",
    overview:
      "Adobe makes software for creative work, digital documents, and customer experience management, serving individual creators and organizations.",
    pitch:
      "Adobe builds tools for creating content, working with digital documents, and delivering customer experiences.",
    sourceUrl: "https://www.adobe.com/about-adobe.html",
    checkedAt: "2026-10-27",
  },
  blazel: {
    logoPath: "/companies/blazel.png",
    accent: "#171717",
    websiteUrl: "https://www.blazel.com/",
    overview:
      "Blazel describes its product as a LinkedIn content and go-to-market platform. It helps teams develop posts in their own voices and connect engagement to sales workflows.",
    pitch:
      "Blazel helps companies turn ideas into LinkedIn content and use the resulting engagement to support their sales pipeline.",
    sourceUrl: "https://www.blazel.com/",
    checkedAt: "2026-10-27",
  },
};
