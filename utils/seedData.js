const crewRoles = [
  "Director",
  "Producer",
  "Cinematographer",
  "Editor",
  "Production Designer",
  "Composer",
  "Sound Designer",
  "Costume Designer",
  "Screenwriter",
  "VFX Supervisor"
];

const firstNames = [
  "Avery",
  "Jordan",
  "Taylor",
  "Quinn",
  "Riley",
  "Skyler",
  "Morgan",
  "Parker",
  "Sage",
  "Rowan",
  "Blake",
  "Cameron",
  "Drew",
  "Emerson",
  "Finley",
  "Harper",
  "Jules",
  "Kai",
  "Logan",
  "Marlowe",
  "Nico",
  "Phoenix",
  "Reese",
  "Shiloh",
  "Tatum",
  "Wren",
  "Casey",
  "Ellis",
  "Indigo",
  "Lennon"
];

const lastNames = [
  "Vale",
  "Cross",
  "Monroe",
  "Hale",
  "Mercer",
  "Sloan",
  "Pryce",
  "Keaton",
  "Rowe",
  "Bennett",
  "Hart",
  "Wilder",
  "Sinclair",
  "Lowe",
  "Ellison",
  "Madden",
  "Archer",
  "Hollis",
  "Pierce",
  "Winslow",
  "Frost",
  "Ellery",
  "Lennox",
  "Briar",
  "Marlowe",
  "Sterling",
  "Quill",
  "Raine",
  "Voss",
  "Delaney"
];

const curatedProductions = [
  { title: "The Dark Knight", year: 2008, tmdbId: 155 },
  { title: "Inception", year: 2010, tmdbId: 27205 },
  { title: "The Social Network", year: 2010, tmdbId: 37799 },
  { title: "Her", year: 2013, tmdbId: 152601 },
  { title: "Whiplash", year: 2014, tmdbId: 244786 },
  { title: "Mad Max: Fury Road", year: 2015, tmdbId: 76341 },
  { title: "Ex Machina", year: 2015, tmdbId: 264660 },
  { title: "La La Land", year: 2016, tmdbId: 313369 },
  { title: "Moonlight", year: 2016, tmdbId: 376867 },
  { title: "Get Out", year: 2017, tmdbId: 419430 },
  { title: "Blade Runner 2049", year: 2017, tmdbId: 335984 },
  { title: "Spider-Man: Into the Spider-Verse", year: 2018, tmdbId: 324857 },
  { title: "Parasite", year: 2019, tmdbId: 496243 },
  { title: "Everything Everywhere All at Once", year: 2022, tmdbId: 545611 },
  { title: "Dune: Part Two", year: 2024, tmdbId: 693134 }
];

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

const shuffle = (items) => {
  const cloned = [...items];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
};

const generateCrewMembers = (count = 30) =>
  Array.from({ length: count }, (_, index) => {
    const name = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;

    return {
      name,
      role: crewRoles[index % crewRoles.length],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    };
  });

const generateProductions = (count = 15) => curatedProductions.slice(0, count);

const generateCredits = (crewMembers, productions) => {
  const assignments = new Set();
  const credits = [];

  crewMembers.forEach((crewMember, index) => {
    const production = productions[index % productions.length];
    const key = `${crewMember._id}-${production._id}`;

    assignments.add(key);
    credits.push({
      crewId: crewMember._id,
      productionId: production._id,
      role: crewMember.role
    });
  });

  productions.forEach((production) => {
    const desiredCredits = 4 + Math.floor(Math.random() * 4);
    const selection = shuffle(crewMembers).slice(0, desiredCredits);

    selection.forEach((crewMember) => {
      const key = `${crewMember._id}-${production._id}`;

      if (assignments.has(key)) {
        return;
      }

      assignments.add(key);
      credits.push({
        crewId: crewMember._id,
        productionId: production._id,
        role: crewMember.role
      });
    });
  });

  return credits;
};

module.exports = {
  generateCredits,
  generateCrewMembers,
  generateProductions
};
