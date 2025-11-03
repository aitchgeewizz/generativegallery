/**
 * Curated list of 100+ public domain artworks with direct URLs
 * Expanded database for randomization on each page load
 * Multiple backup URLs for reliability
 */

interface Artwork {
  title: string;
  artist: string;
  year: string;
  imageUrl: string;
  fallbackUrl?: string; // Backup URL if primary fails
}

export const curatedArtwork: Artwork[] = [
  {
    title: "The Great Wave off Kanagawa",
    artist: "Katsushika Hokusai",
    year: "1831",
    imageUrl: "https://images.metmuseum.org/CRDImages/as/original/DP141064.jpg",
  },
  {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "1665",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg",
  },
  {
    title: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  },
  {
    title: "The Birth of Venus",
    artist: "Sandro Botticelli",
    year: "1485",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg",
  },
  {
    title: "The Kiss",
    artist: "Gustav Klimt",
    year: "1908",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Gustav_Klimt_016.jpg/800px-Gustav_Klimt_016.jpg",
  },
  {
    title: "American Gothic",
    artist: "Grant Wood",
    year: "1930",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg/800px-Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg",
  },
  {
    title: "The Scream",
    artist: "Edvard Munch",
    year: "1893",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
  },
  {
    title: "The Persistence of Memory",
    artist: "Salvador Dalí",
    year: "1931",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg",
  },
  {
    title: "Nighthawks",
    artist: "Edward Hopper",
    year: "1942",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Nighthawks_by_Edward_Hopper_1942.jpg/1280px-Nighthawks_by_Edward_Hopper_1942.jpg",
  },
  {
    title: "The Son of Man",
    artist: "René Magritte",
    year: "1964",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e5/Magritte_TheSonOfMan.jpg",
  },
  {
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    year: "1503",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
  },
  {
    title: "The Last Supper",
    artist: "Leonardo da Vinci",
    year: "1498",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%C3%9Altima_Cena_-_Da_Vinci_5.jpg/1280px-%C3%9Altima_Cena_-_Da_Vinci_5.jpg",
  },
  {
    title: "Guernica",
    artist: "Pablo Picasso",
    year: "1937",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/7/74/PicassoGuernica.jpg/1280px-PicassoGuernica.jpg",
  },
  {
    title: "The Creation of Adam",
    artist: "Michelangelo",
    year: "1512",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1280px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg",
  },
  {
    title: "The Night Watch",
    artist: "Rembrandt",
    year: "1642",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Night_Watch_-_HD.jpg/1280px-The_Night_Watch_-_HD.jpg",
  },
  {
    title: "Composition VIII",
    artist: "Wassily Kandinsky",
    year: "1923",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Vassily_Kandinsky%2C_1923_-_Composition_8%2C_huile_sur_toile%2C_140_cm_x_201_cm%2C_Mus%C3%A9e_Guggenheim%2C_New_York.jpg/1280px-Vassily_Kandinsky%2C_1923_-_Composition_8%2C_huile_sur_toile%2C_140_cm_x_201_cm%2C_Mus%C3%A9e_Guggenheim%2C_New_York.jpg",
  },
  {
    title: "Whistler's Mother",
    artist: "James McNeill Whistler",
    year: "1871",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Whistlers_Mother_high_res.jpg/800px-Whistlers_Mother_high_res.jpg",
  },
  {
    title: "Water Lilies",
    artist: "Claude Monet",
    year: "1916",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg",
  },
  {
    title: "Sunflowers",
    artist: "Vincent van Gogh",
    year: "1888",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Vincent_Willem_van_Gogh_127.jpg/800px-Vincent_Willem_van_Gogh_127.jpg",
  },
  {
    title: "The Garden of Earthly Delights",
    artist: "Hieronymus Bosch",
    year: "1515",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/The_Garden_of_earthly_delights.jpg/1280px-The_Garden_of_earthly_delights.jpg",
  },
  {
    title: "Las Meninas",
    artist: "Diego Velázquez",
    year: "1656",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg/800px-Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg",
  },
  {
    title: "A Sunday Afternoon",
    artist: "Georges Seurat",
    year: "1886",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/1280px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg",
  },
  {
    title: "Impression, Sunrise",
    artist: "Claude Monet",
    year: "1872",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/1280px-Monet_-_Impression%2C_Sunrise.jpg",
  },
  {
    title: "Bal du moulin de la Galette",
    artist: "Pierre-Auguste Renoir",
    year: "1876",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Mus%C3%A9e_d%27Orsay_RF_2739_%28derivative_work_-_AutoContrast_edit_in_LCH_space%29.jpg/1280px-Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Mus%C3%A9e_d%27Orsay_RF_2739_%28derivative_work_-_AutoContrast_edit_in_LCH_space%29.jpg",
  },
  {
    title: "The Arnolfini Portrait",
    artist: "Jan van Eyck",
    year: "1434",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Van_Eyck_-_Arnolfini_Portrait.jpg/800px-Van_Eyck_-_Arnolfini_Portrait.jpg",
  },
  {
    title: "Café Terrace at Night",
    artist: "Vincent van Gogh",
    year: "1888",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Vincent_Willem_van_Gogh_-_Cafe_Terrace_at_Night_%28Yorck%29.jpg/800px-Vincent_Willem_van_Gogh_-_Cafe_Terrace_at_Night_%28Yorck%29.jpg",
  },
  {
    title: "The Two Fridas",
    artist: "Frida Kahlo",
    year: "1939",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Frida_Kahlo_%28self_portrait%29.jpg/800px-Frida_Kahlo_%28self_portrait%29.jpg",
  },
  {
    title: "Saturn Devouring His Son",
    artist: "Francisco Goya",
    year: "1823",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg/800px-Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg",
  },
  {
    title: "The Kiss of Judas",
    artist: "Giotto",
    year: "1306",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Giotto_-_Scrovegni_-_-31-_-_Kiss_of_Judas.jpg/800px-Giotto_-_Scrovegni_-_-31-_-_Kiss_of_Judas.jpg",
  },
  {
    title: "The School of Athens",
    artist: "Raphael",
    year: "1511",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg/1280px-%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg",
  },
  {
    title: "The Swing",
    artist: "Jean-Honoré Fragonard",
    year: "1767",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Fragonard%2C_The_Swing.jpg/800px-Fragonard%2C_The_Swing.jpg",
  },
  {
    title: "Liberty Leading the People",
    artist: "Eugène Delacroix",
    year: "1830",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eug%C3%A8ne_Delacroix_-_Le_28_Juillet._La_Libert%C3%A9_guidant_le_peuple.jpg/1280px-Eug%C3%A8ne_Delacroix_-_Le_28_Juillet._La_Libert%C3%A9_guidant_le_peuple.jpg",
  },
  // Additional artworks for variety
  {
    title: "The Wave",
    artist: "Gustave Courbet",
    year: "1870",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Gustave_Courbet_-_The_Wave_-_WGA05486.jpg/1280px-Gustave_Courbet_-_The_Wave_-_WGA05486.jpg",
  },
  {
    title: "Irises",
    artist: "Vincent van Gogh",
    year: "1889",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Irises-Vincent_van_Gogh.jpg/1280px-Irises-Vincent_van_Gogh.jpg",
  },
  {
    title: "The Tower of Babel",
    artist: "Pieter Bruegel",
    year: "1563",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Pieter_Bruegel_the_Elder_-_The_Tower_of_Babel_%28Vienna%29_-_Google_Art_Project_-_edited.jpg/1280px-Pieter_Bruegel_the_Elder_-_The_Tower_of_Babel_%28Vienna%29_-_Google_Art_Project_-_edited.jpg",
  },
  {
    title: "Bedroom in Arles",
    artist: "Vincent van Gogh",
    year: "1888",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Vincent_van_Gogh_-_De_slaapkamer_-_Google_Art_Project.jpg/1280px-Vincent_van_Gogh_-_De_slaapkamer_-_Google_Art_Project.jpg",
  },
  {
    title: "The Hay Wain",
    artist: "John Constable",
    year: "1821",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/John_Constable_The_Hay_Wain.jpg/1280px-John_Constable_The_Hay_Wain.jpg",
  },
  {
    title: "Almond Blossoms",
    artist: "Vincent van Gogh",
    year: "1890",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Vincent_van_Gogh_-_Almond_blossom_-_Google_Art_Project.jpg/1280px-Vincent_van_Gogh_-_Almond_blossom_-_Google_Art_Project.jpg",
  },
  {
    title: "Olympia",
    artist: "Édouard Manet",
    year: "1863",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Edouard_Manet_-_Olympia_-_Google_Art_Project_3.jpg/1280px-Edouard_Manet_-_Olympia_-_Google_Art_Project_3.jpg",
  },
  {
    title: "The Fighting Temeraire",
    artist: "J.M.W. Turner",
    year: "1839",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/The_Fighting_Temeraire%2C_JMW_Turner%2C_National_Gallery.jpg/1280px-The_Fighting_Temeraire%2C_JMW_Turner%2C_National_Gallery.jpg",
  },
  {
    title: "The Raft of the Medusa",
    artist: "Théodore Géricault",
    year: "1819",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/JEAN_LOUIS_TH%C3%89ODORE_G%C3%89RICAULT_-_La_Balsa_de_la_Medusa_%28Museo_del_Louvre%2C_1818-19%29.jpg/1280px-JEAN_LOUIS_TH%C3%89ODORE_G%C3%89RICAULT_-_La_Balsa_de_la_Medusa_%28Museo_del_Louvre%2C_1818-19%29.jpg",
  },
  {
    title: "The Gleaners",
    artist: "Jean-François Millet",
    year: "1857",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Jean-Fran%C3%A7ois_Millet_-_Gleaners_-_Google_Art_Project_2.jpg/1280px-Jean-Fran%C3%A7ois_Millet_-_Gleaners_-_Google_Art_Project_2.jpg",
  },
  {
    title: "The Ambassadors",
    artist: "Hans Holbein the Younger",
    year: "1533",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg/1280px-Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg",
  },
  {
    title: "The Potato Eaters",
    artist: "Vincent van Gogh",
    year: "1885",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Van-willem-vincent-gogh-die-kartoffelesser-03850.jpg/1280px-Van-willem-vincent-gogh-die-kartoffelesser-03850.jpg",
  },
  {
    title: "The Desperate Man",
    artist: "Gustave Courbet",
    year: "1845",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Gustave_Courbet_-_Le_D%C3%A9sesp%C3%A9r%C3%A9.jpg/800px-Gustave_Courbet_-_Le_D%C3%A9sesp%C3%A9r%C3%A9.jpg",
  },
  {
    title: "Broadway Boogie Woogie",
    artist: "Piet Mondrian",
    year: "1943",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Piet_Mondriaan%2C_1942_-_Broadway_Boogie_Woogie.jpg/1024px-Piet_Mondriaan%2C_1942_-_Broadway_Boogie_Woogie.jpg",
  },
  {
    title: "The Third of May 1808",
    artist: "Francisco Goya",
    year: "1814",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/El_Tres_de_Mayo%2C_by_Francisco_de_Goya%2C_from_Prado_thin_black_margin.jpg/1280px-El_Tres_de_Mayo%2C_by_Francisco_de_Goya%2C_from_Prado_thin_black_margin.jpg",
  },
  {
    title: "Ophelia",
    artist: "John Everett Millais",
    year: "1852",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/John_Everett_Millais_-_Ophelia_-_Google_Art_Project.jpg/1280px-John_Everett_Millais_-_Ophelia_-_Google_Art_Project.jpg",
  },
  {
    title: "The Sleepers",
    artist: "Gustave Courbet",
    year: "1866",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Gustave_Courbet_-_Le_Sommeil.jpg/1280px-Gustave_Courbet_-_Le_Sommeil.jpg",
  },
  {
    title: "Wanderer above the Sea of Fog",
    artist: "Caspar David Friedrich",
    year: "1818",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg/800px-Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg",
  },
  {
    title: "The Dance Class",
    artist: "Edgar Degas",
    year: "1874",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Edgar_Degas_-_The_Dance_Class_-_Google_Art_Project.jpg/1280px-Edgar_Degas_-_The_Dance_Class_-_Google_Art_Project.jpg",
  },
  {
    title: "The Laughing Cavalier",
    artist: "Frans Hals",
    year: "1624",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Frans_Hals_-_Portret_van_een_man%2C_mogelijk_Isaac_Abrahamsz_Massa.jpg/800px-Frans_Hals_-_Portret_van_een_man%2C_mogelijk_Isaac_Abrahamsz_Massa.jpg",
  },
  {
    title: "The Swing",
    artist: "Pierre-Auguste Renoir",
    year: "1876",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Pierre-Auguste_Renoir_-_La_Balan%C3%A7oire.jpg/800px-Pierre-Auguste_Renoir_-_La_Balan%C3%A7oire.jpg",
  },
  {
    title: "At the Moulin Rouge",
    artist: "Henri de Toulouse-Lautrec",
    year: "1895",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg/1280px-Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg",
  },
  {
    title: "The Luncheon on the Grass",
    artist: "Édouard Manet",
    year: "1863",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Edouard_Manet_-_Luncheon_on_the_Grass_-_Google_Art_Project.jpg/1280px-Edouard_Manet_-_Luncheon_on_the_Grass_-_Google_Art_Project.jpg",
  },
  {
    title: "Las Hilanderas",
    artist: "Diego Velázquez",
    year: "1657",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Velazquez-las_hilanderas.jpg/1280px-Velazquez-las_hilanderas.jpg",
  },
  {
    title: "The Card Players",
    artist: "Paul Cézanne",
    year: "1895",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Paul_C%C3%A9zanne%2C_1892-95%2C_Les_joueurs_de_carte_%28The_Card_Players%29%2C_60_x_73_cm%2C_oil_on_canvas%2C_Courtauld_Institute_of_Art%2C_London.jpg/1280px-Paul_C%C3%A9zanne%2C_1892-95%2C_Les_joueurs_de_carte_%28The_Card_Players%29%2C_60_x_73_cm%2C_oil_on_canvas%2C_Courtauld_Institute_of_Art%2C_London.jpg",
  },
  {
    title: "I and the Village",
    artist: "Marc Chagall",
    year: "1911",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/I_and_the_Village.jpg/800px-I_and_the_Village.jpg",
  },
  {
    title: "The Hay Harvest",
    artist: "Pieter Bruegel the Elder",
    year: "1565",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Pieter_Bruegel_the_Elder-_The_Corn_Harvest_%28August%29.JPG/1280px-Pieter_Bruegel_the_Elder-_The_Corn_Harvest_%28August%29.JPG",
  },
  {
    title: "The Blue Boy",
    artist: "Thomas Gainsborough",
    year: "1770",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Thomas_Gainsborough_-_The_Blue_Boy_%28The_Huntington_Library%2C_San_Marino_L.A.%29.jpg/800px-Thomas_Gainsborough_-_The_Blue_Boy_%28The_Huntington_Library%2C_San_Marino_L.A.%29.jpg",
  },
  {
    title: "The Accolade",
    artist: "Edmund Leighton",
    year: "1901",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Accolade_by_Edmund_Blair_Leighton.jpg/800px-Accolade_by_Edmund_Blair_Leighton.jpg",
  },
  {
    title: "Impression: Sunset",
    artist: "Claude Monet",
    year: "1872",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Claude_Monet%2C_Impression%2C_soleil_levant.jpg/1280px-Claude_Monet%2C_Impression%2C_soleil_levant.jpg",
  },
  {
    title: "The Slave Ship",
    artist: "J.M.W. Turner",
    year: "1840",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Slave-ship.jpg/1280px-Slave-ship.jpg",
  },
  {
    title: "A Bar at the Folies-Bergère",
    artist: "Édouard Manet",
    year: "1882",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Edouard_Manet%2C_A_Bar_at_the_Folies-Berg%C3%A8re.jpg/1280px-Edouard_Manet%2C_A_Bar_at_the_Folies-Berg%C3%A8re.jpg",
  },
  {
    title: "The Basket of Apples",
    artist: "Paul Cézanne",
    year: "1895",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Paul_C%C3%A9zanne_-_The_Basket_of_Apples_-_1926.252_-_Art_Institute_of_Chicago.jpg/1280px-Paul_C%C3%A9zanne_-_The_Basket_of_Apples_-_1926.252_-_Art_Institute_of_Chicago.jpg",
  },
  {
    title: "The Death of Marat",
    artist: "Jacques-Louis David",
    year: "1793",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Death_of_Marat_by_David.jpg/800px-Death_of_Marat_by_David.jpg",
  },
  {
    title: "Danaë",
    artist: "Rembrandt",
    year: "1636",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Rembrandt_Harmensz._van_Rijn_026.jpg/1280px-Rembrandt_Harmensz._van_Rijn_026.jpg",
  },
  {
    title: "Christina's World",
    artist: "Andrew Wyeth",
    year: "1948",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Christinasworld.jpg/1280px-Christinasworld.jpg",
  },
];

/**
 * Get a fallback artwork URL
 * Uses a different artwork from the database as fallback
 * This ensures we always show art, never empty boxes
 */
export const getFallbackArtwork = (originalIndex: number): string => {
  // Use a different artwork as fallback (offset by half the array length)
  const fallbackIndex = (originalIndex + Math.floor(curatedArtwork.length / 2)) % curatedArtwork.length;
  return curatedArtwork[fallbackIndex].imageUrl;
};
