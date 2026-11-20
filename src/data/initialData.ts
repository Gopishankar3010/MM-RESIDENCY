import { Product, User, StockLedgerEntry, AuditLogEntry, DropdownOption, DailyOperation, DailySalesReport } from '../types';

export const CASE_PACK_MAP: Record<string, number> = {
  "100BARRELSPORTWINE|750": 12,
  "100BARRELSPORTWINE|180": 48,
  "100PIPERSEXQUISTEWHY|750": 12,
  "100PIPERSEXQUISTEWHY|60": 150,
  "1848XOBRANDY|750": 12,
  "7UP|600": 24,
  "7UP|400": 30,
  "ABSOLUTLEMONFLAV|750": 12,
  "ABSOLUTVODKA|750": 12,
  "ALLWAYSSUPERSTRONGIND|90": 96,
  "AMADOSSPHANTOMBEER|650": 12,
  "ANTIQUITYBLUEWHY|750": 12,
  "ANTIQUITYXOBLENDEDBDY|750": 12,
  "ANTIQUITYXOBLENDEDBDY|90": 96,
  "AQUAFINA|1000": 12,
  "BACARDIBLACKRUM|750": 12,
  "BACARDICARTAWHITERUM|750": 12,
  "BACARDIGINGERRUM|750": 12,
  "BACARDIGUAVARUM|750": 12,
  "BACARDILEMONRUM|750": 12,
  "BACARDILEMONRUM|60": 150,
  "BACARDIMANGOCHILIRUM|750": 12,
  "BACARDIORANGERUM|750": 12,
  "BACARDIORANGERUM|60": 150,
  "BACARDIOROGOLDRUM|750": 12,
  "BACARDIRUM|750": 12,
  "BALLANTINESSCOTCHWHY|750": 12,
  "BALLANTINESSCOTCHWHY|50": 120,
  "BALLETBLUEVODKAMOJITO|750": 12,
  "BALLETBLUEVODKAMOJITO|60": 150,
  "BALLETGREENVODKAGUAVA|750": 12,
  "BALLETGREENVODKAGUAVA|60": 150,
  "BALLETPINKVODKA|750": 12,
  "BALLETPINKVODKA|60": 150,
  "BLACKGOLDVSOPBRANDY|2000": 6,
  "BLACKGOLDVSOPBRANDY|1000": 9,
  "BLACKGOLDVSOPBRANDY|750": 12,
  "BLACKGOLDVSOPBRANDY|90": 96,
  "BLACKWHITESCOTCHWHY|750": 12,
  "BLACKWHITESCOTCHWHY|60": 150,
  "BLACKDOGSCOTCHWHISKY|2000": 4,
  "BLACKDOGSCOTCHWHISKY|750": 12,
  "BLACKDOGSCOTCHWHISKY|60": 150,
  "BLACKDOGTRIGOLDSCOWHY|750": 12,
  "BLACKDOGTRIGOLDSCOWHY|60": 150,
  "BLACKPEARLBEER|650": 12,
  "BLACKPEARLBEER|500": 24,
  "BLENDERSPRIDEWHISKY|750": 12,
  "BLENDERSPRIDEWHISKY|60": 150,
  "BLENDERSPRIDERESERVEWHY|750": 12,
  "BLUEBIRDPORTWINE|180": 48,
  "BLUEGRAP|750": 12,
  "BLUEGRAP|90": 96,
  "BLUEGRAPEFRENCHBDY|750": 12,
  "BLUEGRAPEFRENCHBDY|90": 96,
  "BOCABREEZERJAMUN|275": 24,
  "BOMBAYSAPLONDRYGIN|750": 12,
  "BOROKAFORBIDDENAPPLE|330": 24,
  "BREEZERBLACKBERRYFLAV|275": 24,
  "BREEZERBLUEBERRYFLAV|275": 24,
  "BREEZERBOLDGUAVACHILLI|275": 24,
  "BREEZERCLASSICFLAVOUR|275": 24,
  "BREEZERCRANBERRY|275": 24,
  "BREEZERJAMAICANFLAV|275": 24,
  "BREEZERLEMONADE|275": 24,
  "BREEZERMANGOPEACHFLAV|275": 24,
  "BREEZERORANGE|275": 24,
  "BREEZERWATERMELONFLAV|275": 24,
  "BROCODEKRAFT|330": 24,
  "BROCODEKRAFT|250": 36,
  "BUDWEISERKINGOFBEER|650": 12,
  "BUDWEISERKINGOFBEER|500": 24,
  "BUDWEISERMAGNUMBEER|650": 12,
  "BUDWEISERMAGNUMBEER|500": 24,
  "BUDWISERMAGNUMMDOUBLE|750": 12,
  "CABOWHITERUM|750": 12,
  "CABOWHITERUM|60": 150,
  "CAMPA|1000": 12,
  "CAMPA|500": 24,
  "CAMPA|300": 24,
  "CARLSBERGBEER|650": 12,
  "CARLSBERGBEER|500": 24,
  "CHIVASREGAL12YOSCOTCH|750": 12,
  "CHRISGUAVAVODKA|750": 12,
  "CHRISGUAVAVODKA|90": 96,
  "CHRISLEMONVODKA|750": 12,
  "CHRISLEMONVODKA|90": 96,
  "CHRISMANGOVODKA|750": 12,
  "CHRISMANGOVODKA|90": 96,
  "CHRISORANGEVODKA|750": 12,
  "CHRISORANGEVODKA|90": 96,
  "CHRISWATERMELONVODKA|750": 12,
  "CHRISWATERMELONVODKA|90": 96,
  "CLOVISXOBRANDY|750": 12,
  "CLOVISXOBRANDY|60": 150,
  "CORONAEXTRAPREMIUMBEER|330": 24,
  "COURRIERNAPOLEAN|1000": 9,
  "COURRIERNAPOLEAN|750": 12,
  "COURRIERNAPOLEAN|90": 96,
  "COURRIERNAPOLEANGREEN|750": 12,
  "COURRIERNAPOLEANGREEN|90": 96,
  "DEWARSBLESCOWHY|750": 12,
  "DISCOPANDALEMONSHANDY|330": 24,
  "DISCOPANDAMANGOTANGO|330": 24,
  "ELITEPLANTINUMWINE|750": 12,
  "ELITEPLANTINUMWINE|180": 48,
  "FOSTERGOLDSTRONGBEER|650": 12,
  "FOSTERSPUNCHSTRONG|650": 12,
  "GEOSPREMIERLEAGUEXO|750": 12,
  "GEOSPREMIERLEAGUEXO|90": 96,
  "GOAXXXVSOPIND|750": 12,
  "GOAXXXVSOPIND|90": 96,
  "GODFATHER|650": 12,
  "GODFATHER|500": 24,
  "GOLDBISCUITBRANDY|1000": 9,
  "GOLDBISCUITBRANDY|750": 12,
  "GOLDBISCUITBRANDY|90": 96,
  "GOLDBISCUITRUM|750": 12,
  "GOLDBISCUITVSOP|2000": 6,
  "GOLDBISCUITVSOP|1000": 9,
  "GOLDBISCUITVSOP|750": 12,
  "GOLDBISCUITVSOP|90": 96,
  "GOLDBISCUITXOBDY|750": 12,
  "GOLDENBALLETVSOP|750": 12,
  "GOLDENBALLETVSOP|90": 96,
  "GOLDENTOUCH24CARATBDY|750": 12,
  "GOLDENTOUCH24CARATBDY|90": 96,
  "GRAYSONSINDIANBRANDY|750": 12,
  "GRAYSONSINDIANBRANDY|90": 96,
  "GRAYSONSMAXXROYALEWKY|90": 96,
  "HAYWARDS5000STRONGBEER|650": 12,
  "HAYWARDS5000STRONGBEER|500": 24,
  "HEINEKENLAGERBEER|650": 12,
  "HEINEKENLAGERBEER|500": 24,
  "HERCULESDELUXE3XRUM|750": 12,
  "HOBSONXRBRANDY|750": 12,
  "HOBSONXRBRANDY|60": 150,
  "JACKDANIELS|750": 12,
  "JACOBSCREEKSHIRAZWINE|750": 12,
  "JAGERMEISTER|750": 12,
  "JAGERMEISTER|50": 120,
  "JAMESONIRISHEDITIONWHY|750": 12,
  "JAMESONTRIDISIRISHWHY|750": 12,
  "JAZZBLUEVODKA|750": 12,
  "JEFFERIESBRANDY|1000": 9,
  "JEFFERIESBRANDY|750": 12,
  "JEFFERIESBRANDY|90": 96,
  "JEFFERIESGOLDFINVSOP|750": 12,
  "JEFFERIESGOLDFINVSOP|90": 96,
  "JEFFERIESRESERVEXOBDY|750": 12,
  "JEFFERIESRESERVEXOBDY|90": 96,
  "JIMBEAMKENTBOURBONWHY|750": 12,
  "JOHNNIEWALKERBLACK|750": 12,
  "JOHNNIEWALKERBLACK|50": 192,
  "JOHNNIEWALKERRED|750": 12,
  "JOHNNIEWALKERRED|50": 192,
  "JOHNSMONTCASTLEBRANDY|750": 12,
  "JOHNSMONTCASTLEBRANDY|90": 96,
  "JOYVSOPGRAPEBRANDY|90": 96,
  "KINGLOUISXOBRANDY|750": 12,
  "KINGLOUISXOBRANDY|90": 100,
  "KINGFISHERLAGERBEER|650": 12,
  "KINGFISHERLAGERBEER|500": 24,
  "KINGFISHERSTRONGBEER|650": 12,
  "KINGFISHERSTRONGBEER|500": 24,
  "KINGFISHERULTRALAGER|650": 12,
  "KINGFISHERULTRAMAX|650": 12,
  "KINGFISHERULTRAMAX|500": 24,
  "LAARTINBDY|750": 12,
  "LAFRANZPREMIUMBRANDYC7|750": 12,
  "LAMARTINEBDY|750": 12,
  "M2ALPHONSAMANGOVODKA|750": 12,
  "M2JAMUNSPICYMINTFLVODKA|750": 12,
  "M2MAGICCRANBERRYTEASE|750": 12,
  "M2NEWREMIXFLAVORANGE|60": 150,
  "M2NEWREMIXGREENAPPLE|60": 150,
  "M2NEWREMIXWATERGRAPE|60": 150,
  "MAGICMOMENTSCHOCOFLAV|750": 12,
  "MAGICMOMENTSCHOCOFLAV|60": 150,
  "MAGICMOMENTSFLAVOUR|750": 12,
  "MAGICMOMENTSFLAVOUR|60": 150,
  "MAGICMOMENTSGRAWATMELO|750": 12,
  "MAGICMOMENTSGRAWATMELO|60": 150,
  "MAGICMOMENTSGREENAPPLE|750": 12,
  "MAGICMOMENTSGREENAPPLE|60": 150,
  "MAGICMOMENTSLEMONFLAV|750": 12,
  "MAGICMOMENTSLEMONFLAV|60": 150,
  "MAGICMOMENTSORANGEFLAV|750": 12,
  "MAGICMOMENTSORANGEFLAV|60": 150,
  "MAGICMOMENTSVIVIDPINK|750": 12,
  "MAGICMOMENTSVIVIDPINK|60": 150,
  "MANSIONHOUSE|2000": 6,
  "MANSIONHOUSE|1000": 9,
  "MANSIONHOUSE|750": 12,
  "MANSIONHOUSE|90": 96,
  "MANSIONHOUSEFRENCHBDY|2000": 6,
  "MANSIONHOUSEFRENCHBDY|750": 12,
  "MANSIONHOUSEFRENCHBDY|90": 96,
  "MANSIONHOUSELEMONFLAV|750": 12,
  "MANSIONHOUSELEMONFLAV|90": 96,
  "MANSIONHOUSELEMONWHITE|750": 12,
  "MANSIONHOUSELEMONWHITE|90": 96,
  "MANSIONHOUSEORANGEFLAV|750": 12,
  "MANSIONHOUSEORANGEFLAV|90": 96,
  "MANSIONHOUSEWHISKY|750": 12,
  "MANSIONHOUSEWHISKY|90": 96,
  "MAURICEBLACKFRENCHBDY|750": 12,
  "MAURICEGREENFRENCHBDY|750": 12,
  "MCDOWELLSRESERVEOGWHY|750": 12,
  "MCDOWELLSRESERVEOGWHY|90": 96,
  "MCDOWELLSGOLDINDIANBDY|1000": 9,
  "MCDOWELLSGOLDINDIANBDY|750": 12,
  "MCDOWELLSGOLDINDIANBDY|90": 96,
  "MCDOWELLSVSOPDELUXEBDY|2000": 6,
  "MCDOWELLSVSOPDELUXEBDY|1000": 9,
  "MCDOWELLSVSOPDELUXEBDY|750": 12,
  "MCDOWELLSVSOPDELUXEBDY|90": 96,
  "MENSBLACKDELUXEBRANDY|750": 12,
  "MENSBLACKDELUXEBRANDY|90": 96,
  "MMPREMIUM|750": 12,
  "MORPHEUSXOBDY|750": 12,
  "MORPHEUSXOBDY|60": 150,
  "MORPHEUSXOBLUEBRANDY|750": 12,
  "MORPHEUSXOBLUEBRANDY|60": 150,
  "MUMTAJGRAPEWINE|750": 12,
  "MUMTAJGRAPEWINE|180": 48,
  "NEONVODKAAPPLE|750": 12,
  "NEONVODKAAPPLE|90": 100,
  "NEONVODKAFLAVOUR|750": 12,
  "NEONVODKAFLAVOUR|90": 100,
  "NEONVODKAGUAVA|750": 12,
  "NEONVODKAGUAVA|90": 100,
  "NEONVODKALEMON|750": 12,
  "NEONVODKALEMON|90": 100,
  "NEONVODKAORANGE|750": 12,
  "NEONVODKAORANGE|90": 100,
  "NEONVODKAPINEAPPLE|750": 12,
  "NEONVODKAPINEAPPLE|90": 100,
  "OLDADMIRALBRANDY|750": 12,
  "OLDADMIRALBRANDY|90": 96,
  "OLDMONKAPPLERUM|750": 12,
  "OLDMONKCOFFEERUM|750": 12,
  "OLDMONKLEGENDRUM|750": 12,
  "OLDMONKLEMONRUM|750": 12,
  "OLDMONKRUM|750": 12,
  "OLDMONKRUM|90": 100,
  "OXYGENAPPLEVODKA|750": 12,
  "OXYGENAPPLEVODKA|90": 96,
  "OXYZENORANGEVODKA|750": 12,
  "OXYZENVANILLAVODKA|750": 12,
  "OXYZENVODKA|750": 12,
  "PEOPLESPONDICHERRY|650": 12,
  "PEOPLESPONDICHERRY|330": 24,
  "PEREDAVIDVSOP|1000": 12,
  "PURSUEHARDSELTZER|500": 24,
  "REMYMARTINVSOPBRANDY|700": 12,
  "RESOLUTEPINKVODKA|750": 12,
  "ROCKWHISKY|750": 12,
  "ROULETTELONDONDRYGIN|750": 12,
  "ROULETTEPREXOGRAPEBDY|750": 12,
  "ROULETTEUNPEATEDPREWHY|750": 12,
  "ROYALCHALLANGEBRANDY|750": 12,
  "ROYALCHALLANGEBRANDY|90": 96,
  "ROYALCHALLENGEWHISKY|2000": 6,
  "ROYALCHALLENGEWHISKY|750": 12,
  "ROYALCHALLENGEWHISKY|90": 96,
  "ROYALSTAGDOUBLEDARK|750": 12,
  "SAMARAREDWINE|750": 12,
  "SEAGRAMROYALSTAGBARREL|750": 12,
  "SEAGRAMSIMERIALBLUE|750": 12,
  "SEAGRAMSIMERIALBLUE|90": 96,
  "SEAGRAMSROYALSTAG|2000": 6,
  "SEAGRAMSROYALSTAG|750": 12,
  "SEAGRAMSROYALSTAG|60": 150,
  "SEGRAMS100PIPERSSCHWH|60": 150,
  "SEGRAMSPRIDERESERVEWHY|750": 12,
  "SIDUSPREMIUMREDWINE|750": 12,
  "SIDUSPREMIUMREDWINE|180": 48,
  "SIGNATURERAREAGEDWHY|2000": 6,
  "SIGNATURERAREAGEDWHY|1000": 9,
  "SIGNATURERAREAGEDWHY|750": 12,
  "SMIRNOFFAPPLEVODKA|750": 12,
  "SMIRNOFFAPPLEVODKA|60": 150,
  "SMIRNOFFMINTJAMUNVODKA|750": 12,
  "SMIRNOFFMIRCHIMANGOVOD|750": 12,
  "SMIRNOFFORANGEVODKA|750": 12,
  "SMIRNOFFORANGEVODKA|60": 150,
  "SMIRNOFFTRIPLEDISVODKA|750": 12,
  "SMIRNOFFTRIPLEDISVODKA|60": 150,
  "SMIRNOFFZESTYLIMEVODKA|750": 12,
  "SODA|500": 24,
  "SONICBLACK|330": 24,
  "STREMYVSOPFRENCHBDY|1000": 12,
  "STREMYVSOPFRENCHBDY|700": 12,
  "STREMYXOFRENCHBRANDY|700": 12,
  "STBERNARDNAPOLEANBDY|1000": 12,
  "SULACHENINWHITEWINE|750": 12,
  "SULASHRIAZCABERNETRED|750": 12,
  "SUPERSELECTBDY|750": 12,
  "SUPERSELECTBDY|90": 96,
  "TEACHERS50BLSCOWHY|750": 12,
  "TEACHERSHIGHLANDSCOWHY|750": 12,
  "TEACHERSHIGHLANDSCOWHY|60": 150,
  "THEWEARHOUSETEQUILA|750": 12,
  "THEWEARHOUSETEQUILA|60": 150,
  "TINTOCASHEWFENI|750": 12,
  "TUBORGSTRONGBEER|650": 12,
  "TUBORGSTRONGBEER|500": 24,
  "VASCODAGAMAWINE|750": 12,
  "VAT69BLENDEDSCOTCHWHY|750": 12,
  "VAT69BLENDEDSCOTCHWHY|60": 150,
  "WHISTLERBARAGEDWKY|750": 12,
  "XTASYGOLDVSOPBRANDY|750": 12,
  "XCLAMATIONBRANDY|750": 12,
  "XCLAMATIONRUM|750": 12,
  "XCLAMATIONWHYSKY|750": 12,
  "ZIMRAXTRABDY|750": 12,
  "MORPHEUSXOBRANDY|750": 12,
  "MORPHEUSXOBRANDY|60": 150,
  "100PIPERSEXQUISITEWHY|750": 12,
  "SULASHIRAZCABERNETRED|750": 12,
  "BUZZBALLZGUAVAAROMATIZD|180": 48,
  "FOSTERGOLDSTRONGBEER|500": 24,
  "M2PREMGRAINVODKA|750": 12,
  "OLDMONKWHITERUM|750": 12,
  "PLUNGEFLOVERS|330": 24,
  "SEAGRAMROYALSTAGBARREL|90": 96,
  "SEAGRAMSROYALSTAG|90": 96,
  "SEGRAMS100PIPERSSCHWH|750": 12,
  "COLONIALPREMIUMVSOPBDY|750": 12,
  "DAVIDLOUISXOBDY|750": 12,
  "HEINEKENLAGERBEER|330": 24,
  "JACKDANIELSORGHONEY|750": 12
};

export function packKey_(name: string, size: number | string): string {
  return String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + '|' + Number(size || 0);
}

export function bottlesPerCase_(p: { name?: string; sizeML?: number | string; casePack?: number }): number {
  const mapped = Number(CASE_PACK_MAP[packKey_(p && p.name || '', p && p.sizeML || 0)]) || 0;
  const configured = Number(p && p.casePack) || 0;
  return Math.max(1, configured > 1 ? configured : (mapped || configured || 1));
}

export function stockQtyLabel(q: number, pack: number): string {
  q = Math.max(0, Number(q) || 0);
  pack = Math.max(1, Number(pack) || 1);
  const cases = Math.floor(q / pack);
  const bottles = q % pack;
  return `${cases} cases + ${bottles} btls (${q} btls)`;
}

export const INITIAL_USERS: User[] = [
  { userId: 'USR-000001', username: 'admin', fullName: 'Shop Admin', role: 'ADMIN', active: true, mustChange: false, createdAt: '2026-01-01 09:00:00', password: 'gopi1234' },
  { userId: 'USR-000002', username: 'normal', fullName: 'Normal Counter', role: 'NORMAL', counter: 'NORMAL', active: true, mustChange: false, createdAt: '2026-01-01 09:00:00', password: 'gopi2345' },
  { userId: 'USR-000003', username: 'ac', fullName: 'AC Counter', role: 'AC', counter: 'AC', active: true, mustChange: false, createdAt: '2026-01-01 09:00:00', password: 'gopi3456' }
];

export const INITIAL_SUPPLIERS = [
  'ABC Beverages Ltd',
  'XYZ Distilleries & Breweries',
  'United Spirits Ltd (Diageo)',
  'Carlsberg India Pvt Ltd',
  'Pernod Ricard India',
  'Radico Khaitan Ltd',
  'Allied Blenders & Distillers'
];

export const CATEGORY_ORDER: string[] = [
  'Beer',
  'Brandy',
  'Whisky',
  'Vodka',
  'Rum',
  'Wine',
  'Gin',
  'Liqueurs',
  'Others',
  'Soft Drinks'
];

export function sortProductsCategoryWise<T extends { category?: string; name?: string; sizeML?: number }>(list: T[]): T[] {
  const catRank = (cat?: string) => {
    const idx = CATEGORY_ORDER.indexOf(cat || 'Others');
    return idx === -1 ? 999 : idx;
  };
  return [...list].sort((a, b) => {
    const ra = catRank(a.category);
    const rb = catRank(b.category);
    if (ra !== rb) return ra - rb;
    if (ra === 999 && (a.category || '') !== (b.category || '')) {
      return (a.category || '').localeCompare(b.category || '');
    }
    const nameCmp = (a.name || '').localeCompare(b.name || '');
    if (nameCmp !== 0) return nameCmp;
    return (Number(b.sizeML) || 0) - (Number(a.sizeML) || 0);
  });
}

export const INITIAL_PRODUCTS: Product[] = [
  { productId: 'PRD-000043', name: 'AMADOSS PHANTOM BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 148, active: true },
  { productId: 'PRD-000074', name: 'BLACK PEARL BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 105, active: true },
  { productId: 'PRD-000075', name: 'BLACK PEARL BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 92, active: true },
  { productId: 'PRD-000082', name: 'BOCA BREEZER JAMUN', category: 'Beer', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000005', name: 'BUDWEISER KING OF BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 153, active: true },
  { productId: 'PRD-000095', name: 'BUDWEISER KING OF BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 122, active: true },
  { productId: 'PRD-000004', name: 'BUDWEISER MAGNUM BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 172, active: true },
  { productId: 'PRD-000096', name: 'BUDWEISER MAGNUM BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 140, active: true },
  { productId: 'PRD-000006', name: 'CARLSBERG BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 167, active: true },
  { productId: 'PRD-000103', name: 'CARLSBERG BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 135, active: true },
  { productId: 'PRD-000008', name: 'CORONA EXTRA PREMIUM BEER', category: 'Beer', sizeML: 330, casePack: 24, sellingPrice: 125, active: true },
  { productId: 'PRD-000122', name: 'DISCO PANDA LEMON SHANDY', category: 'Beer', sizeML: 330, casePack: 24, sellingPrice: 228, active: true },
  { productId: 'PRD-000123', name: 'DISCO PANDA MANGO TANGO', category: 'Beer', sizeML: 330, casePack: 24, sellingPrice: 228, active: true },
  { productId: 'PRD-000126', name: 'FOSTER GOLD STRONG BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 129, active: true },
  { productId: 'PRD-000319', name: 'FOSTER GOLD STRONG BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 0, active: true },
  { productId: 'PRD-000127', name: 'FOSTERS PUNCH STRONG', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 118, active: true },
  { productId: 'PRD-000132', name: 'GOD FATHER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 132, active: true },
  { productId: 'PRD-000133', name: 'GOD FATHER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 102, active: true },
  { productId: 'PRD-000150', name: 'HAYWARDS 5000 STRONG BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 125, active: true },
  { productId: 'PRD-000151', name: 'HAYWARDS 5000 STRONG BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 101, active: true },
  { productId: 'PRD-000007', name: 'HEINEKEN LAGER BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 190, active: true },
  { productId: 'PRD-000152', name: 'HEINEKEN LAGER BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 140, active: true },
  { productId: 'PRD-000328', name: 'HEINEKEN LAGER BEER', category: 'Beer', sizeML: 330, casePack: 24, sellingPrice: 105, active: true },
  { productId: 'PRD-000002', name: 'KINGFISHER LAGER BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 125, active: true },
  { productId: 'PRD-000179', name: 'KINGFISHER LAGER BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 100, active: true },
  { productId: 'PRD-000001', name: 'KINGFISHER STRONG BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 134, active: true },
  { productId: 'PRD-000180', name: 'KINGFISHER STRONG BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 105, active: true },
  { productId: 'PRD-000003', name: 'KINGFISHER ULTRA LAGER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 150, active: true },
  { productId: 'PRD-000181', name: 'KINGFISHER ULTRAMAX', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 165, active: true },
  { productId: 'PRD-000182', name: 'KINGFISHER ULTRAMAX', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 135, active: true },
  { productId: 'PRD-000257', name: 'PEOPLES PONDICHERRY', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 178, active: true },
  { productId: 'PRD-000258', name: 'PEOPLES PONDICHERRY', category: 'Beer', sizeML: 330, casePack: 24, sellingPrice: 114, active: true },
  { productId: 'PRD-000260', name: 'PURSUE HARD SELTZER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 168, active: true },
  { productId: 'PRD-000009', name: 'TUBORG STRONG BEER', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 132, active: true },
  { productId: 'PRD-000308', name: 'TUBORG STRONG BEER', category: 'Beer', sizeML: 500, casePack: 24, sellingPrice: 102, active: true },
  { productId: 'PRD-000037', name: '1848 XO BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 758, active: true },
  { productId: 'PRD-000042', name: 'ALLWAYS SUPER STRONG IND', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 34, active: true },
  { productId: 'PRD-000044', name: 'ANTIQUITY XO BLENDED BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 1160, active: true },
  { productId: 'PRD-000045', name: 'ANTIQUITY XO BLENDED BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 144, active: true },
  { productId: 'PRD-000064', name: 'BLACK & GOLD VSOP BRANDY', category: 'Brandy', sizeML: 2000, casePack: 6, sellingPrice: 1440, active: true },
  { productId: 'PRD-000065', name: 'BLACK & GOLD VSOP BRANDY', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 786, active: true },
  { productId: 'PRD-000066', name: 'BLACK & GOLD VSOP BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 596, active: true },
  { productId: 'PRD-000067', name: 'BLACK & GOLD VSOP BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000078', name: 'BLUE GRAP', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 280, active: true },
  { productId: 'PRD-000079', name: 'BLUE GRAP', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 36, active: true },
  { productId: 'PRD-000080', name: 'BLUE GRAPE FRENCH BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 585, active: true },
  { productId: 'PRD-000081', name: 'BLUE GRAPE FRENCH BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 72, active: true },
  { productId: 'PRD-000115', name: 'CLOVIS XO BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 887, active: true },
  { productId: 'PRD-000116', name: 'CLOVIS XO BRANDY', category: 'Brandy', sizeML: 60, casePack: 150, sellingPrice: 78, active: true },
  { productId: 'PRD-000326', name: 'COLONIAL PREMIUM VSOP BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 594, active: true },
  { productId: 'PRD-000117', name: 'COURRIER NAPOLEAN', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 630, active: true },
  { productId: 'PRD-000016', name: 'COURRIER NAPOLEAN', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 474, active: true },
  { productId: 'PRD-000118', name: 'COURRIER NAPOLEAN', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 59, active: true },
  { productId: 'PRD-000119', name: 'COURRIER NAPOLEAN GREEN', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 774, active: true },
  { productId: 'PRD-000120', name: 'COURRIER NAPOLEAN GREEN', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 95, active: true },
  { productId: 'PRD-000327', name: 'DAVID LOUIS XO BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 990, active: true },
  { productId: 'PRD-000128', name: 'GEO\'S PREMIER LEAGUE XO', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 628, active: true },
  { productId: 'PRD-000129', name: 'GEO\'S PREMIER LEAGUE XO', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 78, active: true },
  { productId: 'PRD-000130', name: 'GOA XXX VSOP IND', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 288, active: true },
  { productId: 'PRD-000131', name: 'GOA XXX VSOP IND', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 36, active: true },
  { productId: 'PRD-000134', name: 'GOLD BISCUIT BRANDY', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 408, active: true },
  { productId: 'PRD-000135', name: 'GOLD BISCUIT BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 310, active: true },
  { productId: 'PRD-000136', name: 'GOLD BISCUIT BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 39, active: true },
  { productId: 'PRD-000138', name: 'GOLD BISCUIT VSOP', category: 'Brandy', sizeML: 2000, casePack: 6, sellingPrice: 996, active: true },
  { productId: 'PRD-000139', name: 'GOLD BISCUIT VSOP', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 515, active: true },
  { productId: 'PRD-000140', name: 'GOLD BISCUIT VSOP', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 396, active: true },
  { productId: 'PRD-000141', name: 'GOLD BISCUIT VSOP', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 48, active: true },
  { productId: 'PRD-000142', name: 'GOLD BISCUIT XO BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 480, active: true },
  { productId: 'PRD-000143', name: 'GOLDEN BALLET VSOP', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 468, active: true },
  { productId: 'PRD-000144', name: 'GOLDEN BALLET VSOP', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000145', name: 'GOLDEN TOUCH 24CARAT BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 590, active: true },
  { productId: 'PRD-000146', name: 'GOLDEN TOUCH 24CARAT BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000147', name: 'GRAYSONS INDIAN BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 310, active: true },
  { productId: 'PRD-000148', name: 'GRAYSONS INDIAN BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 36, active: true },
  { productId: 'PRD-000154', name: 'HOBSON XR BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 1680, active: true },
  { productId: 'PRD-000155', name: 'HOBSON XR BRANDY', category: 'Brandy', sizeML: 60, casePack: 150, sellingPrice: 138, active: true },
  { productId: 'PRD-000163', name: 'JEFFERIES BRANDY', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 416, active: true },
  { productId: 'PRD-000164', name: 'JEFFERIES BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 312, active: true },
  { productId: 'PRD-000165', name: 'JEFFERIES BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 39, active: true },
  { productId: 'PRD-000166', name: 'JEFFERIES GOLD FIN VSOP', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 432, active: true },
  { productId: 'PRD-000167', name: 'JEFFERIES GOLD FIN VSOP', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 54, active: true },
  { productId: 'PRD-000168', name: 'JEFFERIES RESERVE XO BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 600, active: true },
  { productId: 'PRD-000169', name: 'JEFFERIES RESERVE XO BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 75, active: true },
  { productId: 'PRD-000174', name: 'JOHNS MONT CASTLE BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 560, active: true },
  { productId: 'PRD-000175', name: 'JOHNS MONT CASTLE BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 70, active: true },
  { productId: 'PRD-000176', name: 'JOY VSOP GRAPE BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 35, active: true },
  { productId: 'PRD-000177', name: 'KING LOUIS XO BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 600, active: true },
  { productId: 'PRD-000178', name: 'KING LOUIS XO BRANDY', category: 'Brandy', sizeML: 90, casePack: 100, sellingPrice: 72, active: true },
  { productId: 'PRD-000183', name: 'LA ARTIN BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 36, active: true },
  { productId: 'PRD-000184', name: 'LA FRANZ PREMIUM BRANDYC7', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 990, active: true },
  { productId: 'PRD-000185', name: 'LA MARTINE BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 586, active: true },
  { productId: 'PRD-000205', name: 'MANSION HOUSE', category: 'Brandy', sizeML: 2000, casePack: 6, sellingPrice: 1427, active: true },
  { productId: 'PRD-000206', name: 'MANSION HOUSE', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 797, active: true },
  { productId: 'PRD-000207', name: 'MANSION HOUSE', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 596, active: true },
  { productId: 'PRD-000208', name: 'MANSION HOUSE', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000209', name: 'MANSION HOUSE FRENCH BDY', category: 'Brandy', sizeML: 2000, casePack: 6, sellingPrice: 1427, active: true },
  { productId: 'PRD-000010', name: 'MANSION HOUSE FRENCH BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 596, active: true },
  { productId: 'PRD-000011', name: 'MANSION HOUSE FRENCH BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000210', name: 'MANSION HOUSE LEMON FLAV', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 730, active: true },
  { productId: 'PRD-000211', name: 'MANSION HOUSE LEMON FLAV', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 90, active: true },
  { productId: 'PRD-000212', name: 'MANSION HOUSE LEMON WHITE', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 730, active: true },
  { productId: 'PRD-000213', name: 'MANSION HOUSE LEMON WHITE', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 90, active: true },
  { productId: 'PRD-000214', name: 'MANSION HOUSE ORANGE FLAV', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 730, active: true },
  { productId: 'PRD-000215', name: 'MANSION HOUSE ORANGE FLAV', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 90, active: true },
  { productId: 'PRD-000218', name: 'MAURICE BLACK FRENCH BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 1240, active: true },
  { productId: 'PRD-000219', name: 'MAURICE GREEN FRENCH BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 900, active: true },
  { productId: 'PRD-000222', name: 'MCDOWELLS GOLD INDIAN BDY', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 585, active: true },
  { productId: 'PRD-000223', name: 'MCDOWELLS GOLD INDIAN BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 440, active: true },
  { productId: 'PRD-000224', name: 'MCDOWELLS GOLD INDIAN BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 58, active: true },
  { productId: 'PRD-000225', name: 'MCDOWELLS VSOP DELUXE BDY', category: 'Brandy', sizeML: 2000, casePack: 6, sellingPrice: 1230, active: true },
  { productId: 'PRD-000226', name: 'MCDOWELLS VSOP DELUXE BDY', category: 'Brandy', sizeML: 1000, casePack: 9, sellingPrice: 620, active: true },
  { productId: 'PRD-000014', name: 'MCDOWELLS VSOP DELUXE BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 465, active: true },
  { productId: 'PRD-000227', name: 'MCDOWELLS VSOP DELUXE BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 68, active: true },
  { productId: 'PRD-000228', name: 'MENS BLACK DELUXE BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 389, active: true },
  { productId: 'PRD-000229', name: 'MENS BLACK DELUXE BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 48, active: true },
  { productId: 'PRD-000012', name: 'MORPHEUS XO BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 900, active: true },
  { productId: 'PRD-000013', name: 'MORPHEUS XO BDY', category: 'Brandy', sizeML: 60, casePack: 150, sellingPrice: 77, active: true },
  { productId: 'PRD-000231', name: 'MORPHEUS XO BLUE BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 1160, active: true },
  { productId: 'PRD-000232', name: 'MORPHEUS XO BLUE BRANDY', category: 'Brandy', sizeML: 60, casePack: 150, sellingPrice: 95, active: true },
  { productId: 'PRD-000015', name: 'OLD ADMIRAL BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 348, active: true },
  { productId: 'PRD-000247', name: 'OLD ADMIRAL BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 42, active: true },
  { productId: 'PRD-000259', name: 'PERE DAVID VSOP', category: 'Brandy', sizeML: 1000, casePack: 12, sellingPrice: 1896, active: true },
  { productId: 'PRD-000261', name: 'REMY MARTIN VSOP BRANDY', category: 'Brandy', sizeML: 700, casePack: 12, sellingPrice: 11234, active: true },
  { productId: 'PRD-000265', name: 'ROULETTE PRE XO GRAPE BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 1132, active: true },
  { productId: 'PRD-000267', name: 'ROYAL CHALLANGE BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 650, active: true },
  { productId: 'PRD-000268', name: 'ROYAL CHALLANGE BRANDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 78, active: true },
  { productId: 'PRD-000295', name: 'ST REMY VSOP FRENCH BDY', category: 'Brandy', sizeML: 1000, casePack: 12, sellingPrice: 3923, active: true },
  { productId: 'PRD-000296', name: 'ST REMY VSOP FRENCH BDY', category: 'Brandy', sizeML: 700, casePack: 12, sellingPrice: 2850, active: true },
  { productId: 'PRD-000297', name: 'ST REMY XO FRENCH BRANDY', category: 'Brandy', sizeML: 700, casePack: 12, sellingPrice: 3870, active: true },
  { productId: 'PRD-000298', name: 'ST.BERNARD NAPOLEAN BDY', category: 'Brandy', sizeML: 1000, casePack: 12, sellingPrice: 1800, active: true },
  { productId: 'PRD-000300', name: 'SUPER SELECT BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 252, active: true },
  { productId: 'PRD-000301', name: 'SUPER SELECT BDY', category: 'Brandy', sizeML: 90, casePack: 96, sellingPrice: 34, active: true },
  { productId: 'PRD-000313', name: 'X\'TASY GOLD VSOP BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 516, active: true },
  { productId: 'PRD-000314', name: 'XCLAMATION BRANDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 800, active: true },
  { productId: 'PRD-000317', name: 'ZIMRA XTRA BDY', category: 'Brandy', sizeML: 750, casePack: 12, sellingPrice: 1488, active: true },
  { productId: 'PRD-000023', name: '100 PIPERS EXQUISTE WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1700, active: true },
  { productId: 'PRD-000036', name: '100 PIPERS EXQUISTE WHY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 150, active: true },
  { productId: 'PRD-000021', name: 'ANTIQUITY BLUE WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1212, active: true },
  { productId: 'PRD-000056', name: 'BALLANTINE\'S SCOTCH WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 2280, active: true },
  { productId: 'PRD-000057', name: 'BALLANTINE\'S SCOTCH WHY', category: 'Whisky', sizeML: 50, casePack: 120, sellingPrice: 200, active: true },
  { productId: 'PRD-000068', name: 'BLACK & WHITE SCOTCH WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1761, active: true },
  { productId: 'PRD-000069', name: 'BLACK & WHITE SCOTCH WHY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 167, active: true },
  { productId: 'PRD-000070', name: 'BLACK DOG SCOTCH WHISKY', category: 'Whisky', sizeML: 2000, casePack: 4, sellingPrice: 3868, active: true },
  { productId: 'PRD-000022', name: 'BLACK DOG SCOTCH WHISKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1677, active: true },
  { productId: 'PRD-000071', name: 'BLACK DOG SCOTCH WHISKY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 156, active: true },
  { productId: 'PRD-000072', name: 'BLACK DOG TRI GOLD SCOWHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 2333, active: true },
  { productId: 'PRD-000073', name: 'BLACK DOG TRI GOLD SCOWHY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 203, active: true },
  { productId: 'PRD-000018', name: 'BLENDERS PRIDE WHISKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1080, active: true },
  { productId: 'PRD-000019', name: 'BLENDERS PRIDE WHISKY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 95, active: true },
  { productId: 'PRD-000076', name: 'BLENDERSPRIDE RESERVE WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1188, active: true },
  { productId: 'PRD-000097', name: 'BUDWISER MAGNUMM DOUBLE', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1800, active: true },
  { productId: 'PRD-000104', name: 'CHIVAS REGAL 12YO SCOTCH', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 3970, active: true },
  { productId: 'PRD-000121', name: 'DEWARS BLE SCO WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1634, active: true },
  { productId: 'PRD-000149', name: 'GRAYSONS MAXX ROYALE WKY', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000156', name: 'JACK DANIELS', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 4200, active: true },
  { productId: 'PRD-000329', name: 'JACK DANIELS ORG HONEY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 4200, active: true },
  { productId: 'PRD-000160', name: 'JAMESON IRISH EDITION WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 3280, active: true },
  { productId: 'PRD-000161', name: 'JAMESON TRI DIS IRISH WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 2670, active: true },
  { productId: 'PRD-000170', name: 'JIM BEAM KENT BOURBON WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1960, active: true },
  { productId: 'PRD-000171', name: 'JOHNNIE WALKER BLACK', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 4108, active: true },
  { productId: 'PRD-000172', name: 'JOHNNIE WALKER BLACK', category: 'Whisky', sizeML: 50, casePack: 192, sellingPrice: 360, active: true },
  { productId: 'PRD-000024', name: 'JOHNNIE WALKER RED', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 2426, active: true },
  { productId: 'PRD-000173', name: 'JOHNNIE WALKER RED', category: 'Whisky', sizeML: 50, casePack: 192, sellingPrice: 209, active: true },
  { productId: 'PRD-000216', name: 'MANSION HOUSE WHISKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 730, active: true },
  { productId: 'PRD-000217', name: 'MANSION HOUSE WHISKY', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 90, active: true },
  { productId: 'PRD-000220', name: 'MC DOWELLS RESERVE OG WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 570, active: true },
  { productId: 'PRD-000221', name: 'MC DOWELLS RESERVE OG WHY', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 71, active: true },
  { productId: 'PRD-000263', name: 'ROCK WHISKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 588, active: true },
  { productId: 'PRD-000266', name: 'ROULETTE UNPEATED PRE WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1160, active: true },
  { productId: 'PRD-000269', name: 'ROYAL CHALLENGE WHISKY', category: 'Whisky', sizeML: 2000, casePack: 6, sellingPrice: 1961, active: true },
  { productId: 'PRD-000270', name: 'ROYAL CHALLENGE WHISKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 807, active: true },
  { productId: 'PRD-000271', name: 'ROYAL CHALLENGE WHISKY', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 105, active: true },
  { productId: 'PRD-000017', name: 'ROYAL STAG DOUBLE DARK', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 778, active: true },
  { productId: 'PRD-000273', name: 'SEAGRAM ROYAL STAG BARREL', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 800, active: true },
  { productId: 'PRD-000323', name: 'SEAGRAM ROYAL STAG BARREL', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 0, active: true },
  { productId: 'PRD-000274', name: 'SEAGRAMS IMERIAL BLUE', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 544, active: true },
  { productId: 'PRD-000275', name: 'SEAGRAMS IMERIAL BLUE', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 74, active: true },
  { productId: 'PRD-000276', name: 'SEAGRAMS ROYAL STAG', category: 'Whisky', sizeML: 2000, casePack: 6, sellingPrice: 1869, active: true },
  { productId: 'PRD-000277', name: 'SEAGRAMS ROYAL STAG', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 735, active: true },
  { productId: 'PRD-000324', name: 'SEAGRAMS ROYAL STAG', category: 'Whisky', sizeML: 90, casePack: 96, sellingPrice: 95, active: true },
  { productId: 'PRD-000278', name: 'SEAGRAMS ROYAL STAG', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 63, active: true },
  { productId: 'PRD-000325', name: 'SEGRAMS 100 PIPERS SCH WH', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1700, active: true },
  { productId: 'PRD-000279', name: 'SEGRAMS 100 PIPERS SCH WH', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 63, active: true },
  { productId: 'PRD-000280', name: 'SEGRAMS PRIDE RESERVE WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1188, active: true },
  { productId: 'PRD-000283', name: 'SIGNATURE RARE AGED WHY', category: 'Whisky', sizeML: 2000, casePack: 6, sellingPrice: 2213, active: true },
  { productId: 'PRD-000284', name: 'SIGNATURE RARE AGED WHY', category: 'Whisky', sizeML: 1000, casePack: 9, sellingPrice: 1246, active: true },
  { productId: 'PRD-000020', name: 'SIGNATURE RARE AGED WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1056, active: true },
  { productId: 'PRD-000302', name: 'TEACHERS 50 BL SCO WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 2280, active: true },
  { productId: 'PRD-000303', name: 'TEACHERS HIGHLAND SCO WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1660, active: true },
  { productId: 'PRD-000304', name: 'TEACHERS HIGHLAND SCO WHY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 150, active: true },
  { productId: 'PRD-000310', name: 'VAT 69 BLENDED SCOTCH WHY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 1461, active: true },
  { productId: 'PRD-000311', name: 'VAT 69 BLENDED SCOTCH WHY', category: 'Whisky', sizeML: 60, casePack: 150, sellingPrice: 156, active: true },
  { productId: 'PRD-000312', name: 'WHISTLER BAR AGED WKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 0, active: true },
  { productId: 'PRD-000316', name: 'XCLAMATION WHYSKY', category: 'Whisky', sizeML: 750, casePack: 12, sellingPrice: 800, active: true },
  { productId: 'PRD-000040', name: 'ABSOLUT LEMON FLAV', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 2420, active: true },
  { productId: 'PRD-000041', name: 'ABSOLUT VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 2270, active: true },
  { productId: 'PRD-000058', name: 'BALLET BLUE VODKA MOJITO', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 600, active: true },
  { productId: 'PRD-000059', name: 'BALLET BLUE VODKA MOJITO', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 48, active: true },
  { productId: 'PRD-000060', name: 'BALLET GREEN VODKA GUAVA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 600, active: true },
  { productId: 'PRD-000061', name: 'BALLET GREEN VODKA GUAVA', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 48, active: true },
  { productId: 'PRD-000062', name: 'BALLET PINK VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 600, active: true },
  { productId: 'PRD-000063', name: 'BALLET PINK VODKA', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 48, active: true },
  { productId: 'PRD-000105', name: 'CHRIS GUAVA VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 376, active: true },
  { productId: 'PRD-000106', name: 'CHRIS GUAVA VODKA', category: 'Vodka', sizeML: 90, casePack: 96, sellingPrice: 47, active: true },
  { productId: 'PRD-000107', name: 'CHRIS LEMON VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 376, active: true },
  { productId: 'PRD-000108', name: 'CHRIS LEMON VODKA', category: 'Vodka', sizeML: 90, casePack: 96, sellingPrice: 47, active: true },
  { productId: 'PRD-000109', name: 'CHRIS MANGO VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 376, active: true },
  { productId: 'PRD-000110', name: 'CHRIS MANGO VODKA', category: 'Vodka', sizeML: 90, casePack: 96, sellingPrice: 47, active: true },
  { productId: 'PRD-000111', name: 'CHRIS ORANGE VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 376, active: true },
  { productId: 'PRD-000112', name: 'CHRIS ORANGE VODKA', category: 'Vodka', sizeML: 90, casePack: 96, sellingPrice: 47, active: true },
  { productId: 'PRD-000113', name: 'CHRIS WATERMELON VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 376, active: true },
  { productId: 'PRD-000114', name: 'CHRIS WATERMELON VODKA', category: 'Vodka', sizeML: 90, casePack: 96, sellingPrice: 47, active: true },
  { productId: 'PRD-000162', name: 'JAZZ BLUE VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 942, active: true },
  { productId: 'PRD-000186', name: 'M2 ALPHONSA MANGO VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000187', name: 'M2 JAMUNSPICYMINTFL VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000188', name: 'M2 MAGIC CRANBERRY TEASE', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 840, active: true },
  { productId: 'PRD-000189', name: 'M2 NEWREMIX FLAV.ORANGE', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000190', name: 'M2 NEWREMIX GREEN APPLE', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000191', name: 'M2 NEWREMIX WATER+GRAPE', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000320', name: 'M2 PREM GRAIN VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 0, active: true },
  { productId: 'PRD-000192', name: 'MAGIC MOMENTS CHOCO FLAV', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000193', name: 'MAGIC MOMENTS CHOCO FLAV', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000029', name: 'MAGIC MOMENTS FLAVOUR', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000194', name: 'MAGIC MOMENTS FLAVOUR', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000195', name: 'MAGIC MOMENTS GRA+WATMELO', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000196', name: 'MAGIC MOMENTS GRA+WATMELO', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000197', name: 'MAGIC MOMENTS GREEN APPLE', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000198', name: 'MAGIC MOMENTS GREEN APPLE', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000199', name: 'MAGIC MOMENTS LEMON FLAV', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000200', name: 'MAGIC MOMENTS LEMON FLAV', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000201', name: 'MAGIC MOMENTS ORANGE FLAV', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000202', name: 'MAGIC MOMENTS ORANGE FLAV', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000203', name: 'MAGIC MOMENTS VIVID PINK', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000204', name: 'MAGIC MOMENTS VIVID PINK', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 60, active: true },
  { productId: 'PRD-000230', name: 'MM PREMIUM', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 750, active: true },
  { productId: 'PRD-000235', name: 'NEON VODKA APPLE', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 456, active: true },
  { productId: 'PRD-000236', name: 'NEON VODKA APPLE', category: 'Vodka', sizeML: 90, casePack: 100, sellingPrice: 57, active: true },
  { productId: 'PRD-000237', name: 'NEON VODKA FLAVOUR', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 456, active: true },
  { productId: 'PRD-000238', name: 'NEON VODKA FLAVOUR', category: 'Vodka', sizeML: 90, casePack: 100, sellingPrice: 57, active: true },
  { productId: 'PRD-000239', name: 'NEON VODKA GUAVA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 456, active: true },
  { productId: 'PRD-000240', name: 'NEON VODKA GUAVA', category: 'Vodka', sizeML: 90, casePack: 100, sellingPrice: 57, active: true },
  { productId: 'PRD-000241', name: 'NEON VODKA LEMON', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 456, active: true },
  { productId: 'PRD-000242', name: 'NEON VODKA LEMON', category: 'Vodka', sizeML: 90, casePack: 100, sellingPrice: 57, active: true },
  { productId: 'PRD-000243', name: 'NEON VODKA ORANGE', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 456, active: true },
  { productId: 'PRD-000244', name: 'NEON VODKA ORANGE', category: 'Vodka', sizeML: 90, casePack: 100, sellingPrice: 57, active: true },
  { productId: 'PRD-000245', name: 'NEON VODKA PINEAPPLE', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 456, active: true },
  { productId: 'PRD-000246', name: 'NEON VODKA PINEAPPLE', category: 'Vodka', sizeML: 90, casePack: 100, sellingPrice: 57, active: true },
  { productId: 'PRD-000252', name: 'OXYGEN APPLE VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 510, active: true },
  { productId: 'PRD-000253', name: 'OXYGEN APPLE VODKA', category: 'Vodka', sizeML: 90, casePack: 96, sellingPrice: 68, active: true },
  { productId: 'PRD-000254', name: 'OXYZEN ORANGE VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 510, active: true },
  { productId: 'PRD-000255', name: 'OXYZEN VANILLA VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 562, active: true },
  { productId: 'PRD-000256', name: 'OXYZEN VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 574, active: true },
  { productId: 'PRD-000262', name: 'RESOLUTE PINK VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 898, active: true },
  { productId: 'PRD-000285', name: 'SMIRNOFF APPLE VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 1037, active: true },
  { productId: 'PRD-000286', name: 'SMIRNOFF APPLE VODKA', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 90, active: true },
  { productId: 'PRD-000287', name: 'SMIRNOFF MINT JAMUN VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 1103, active: true },
  { productId: 'PRD-000288', name: 'SMIRNOFF MIRCHI MANGO VOD', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 1103, active: true },
  { productId: 'PRD-000289', name: 'SMIRNOFF ORANGE VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 1037, active: true },
  { productId: 'PRD-000290', name: 'SMIRNOFF ORANGE VODKA', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 90, active: true },
  { productId: 'PRD-000030', name: 'SMIRNOFF TRIPLE DIS VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 912, active: true },
  { productId: 'PRD-000291', name: 'SMIRNOFF TRIPLE DIS VODKA', category: 'Vodka', sizeML: 60, casePack: 150, sellingPrice: 84, active: true },
  { productId: 'PRD-000292', name: 'SMIRNOFF ZESTY LIME VODKA', category: 'Vodka', sizeML: 750, casePack: 12, sellingPrice: 1103, active: true },
  { productId: 'PRD-000047', name: 'BACARDI BLACK RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 576, active: true },
  { productId: 'PRD-000027', name: 'BACARDI CARTA WHITE RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 912, active: true },
  { productId: 'PRD-000048', name: 'BACARDI GINGER RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1036, active: true },
  { productId: 'PRD-000049', name: 'BACARDI GUAVA RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1036, active: true },
  { productId: 'PRD-000028', name: 'BACARDI LEMON RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1036, active: true },
  { productId: 'PRD-000050', name: 'BACARDI LEMON RUM', category: 'Rum', sizeML: 60, casePack: 150, sellingPrice: 89, active: true },
  { productId: 'PRD-000051', name: 'BACARDI MANGO CHILI RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1062, active: true },
  { productId: 'PRD-000052', name: 'BACARDI ORANGE RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1036, active: true },
  { productId: 'PRD-000053', name: 'BACARDI ORANGE RUM', category: 'Rum', sizeML: 60, casePack: 150, sellingPrice: 89, active: true },
  { productId: 'PRD-000054', name: 'BACARDI ORO GOLD RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 912, active: true },
  { productId: 'PRD-000055', name: 'BACARDI RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 912, active: true },
  { productId: 'PRD-000098', name: 'CABO WHITE RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 846, active: true },
  { productId: 'PRD-000099', name: 'CABO WHITE RUM', category: 'Rum', sizeML: 60, casePack: 150, sellingPrice: 168, active: true },
  { productId: 'PRD-000137', name: 'GOLD BISCUIT RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 526, active: true },
  { productId: 'PRD-000153', name: 'HERCULES DELUXE 3X RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 760, active: true },
  { productId: 'PRD-000248', name: 'OLD MONK APPLE RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 800, active: true },
  { productId: 'PRD-000249', name: 'OLD MONK COFFEE RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1250, active: true },
  { productId: 'PRD-000250', name: 'OLD MONK LEGEND RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 1020, active: true },
  { productId: 'PRD-000251', name: 'OLD MONK LEMON RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 800, active: true },
  { productId: 'PRD-000025', name: 'OLD MONK RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 520, active: true },
  { productId: 'PRD-000026', name: 'OLD MONK RUM', category: 'Rum', sizeML: 90, casePack: 100, sellingPrice: 63, active: true },
  { productId: 'PRD-000321', name: 'OLD MONK WHITE RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 0, active: true },
  { productId: 'PRD-000315', name: 'XCLAMATION RUM', category: 'Rum', sizeML: 750, casePack: 12, sellingPrice: 800, active: true },
  { productId: 'PRD-000034', name: '100 BARRELS PORT WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 294, active: true },
  { productId: 'PRD-000035', name: '100 BARRELS PORT WINE', category: 'Wine', sizeML: 180, casePack: 48, sellingPrice: 72, active: true },
  { productId: 'PRD-000077', name: 'BLUE BIRD PORT WINE', category: 'Wine', sizeML: 180, casePack: 48, sellingPrice: 60, active: true },
  { productId: 'PRD-000084', name: 'BOROKA FORBIDDEN APPLE', category: 'Wine', sizeML: 330, casePack: 24, sellingPrice: 130, active: true },
  { productId: 'PRD-000093', name: 'BRO CODE KRAFT', category: 'Wine', sizeML: 330, casePack: 24, sellingPrice: 230, active: true },
  { productId: 'PRD-000094', name: 'BRO CODE KRAFT', category: 'Wine', sizeML: 250, casePack: 36, sellingPrice: 190, active: true },
  { productId: 'PRD-000124', name: 'ELITE PLANTINUM WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 600, active: true },
  { productId: 'PRD-000125', name: 'ELITE PLANTINUM WINE', category: 'Wine', sizeML: 180, casePack: 48, sellingPrice: 150, active: true },
  { productId: 'PRD-000157', name: 'JACOBS CREEK SHIRAZ WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 1500, active: true },
  { productId: 'PRD-000233', name: 'MUMTAJ GRAPE WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 396, active: true },
  { productId: 'PRD-000234', name: 'MUMTAJ GRAPE WINE', category: 'Wine', sizeML: 180, casePack: 48, sellingPrice: 96, active: true },
  { productId: 'PRD-000272', name: 'SAMARA RED WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 586, active: true },
  { productId: 'PRD-000281', name: 'SIDUS PREMIUM RED WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 516, active: true },
  { productId: 'PRD-000282', name: 'SIDUS PREMIUM RED WINE', category: 'Wine', sizeML: 180, casePack: 48, sellingPrice: 171, active: true },
  { productId: 'PRD-000294', name: 'SONIC BLACK', category: 'Wine', sizeML: 330, casePack: 24, sellingPrice: 174, active: true },
  { productId: 'PRD-000299', name: 'SULA CHENIN WHITE WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 926, active: true },
  { productId: 'PRD-000031', name: 'SULA SHRIAZ CABERNET RED', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 1136, active: true },
  { productId: 'PRD-000307', name: 'TINTO CASHEW FENI', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 1398, active: true },
  { productId: 'PRD-000309', name: 'VASCODAGAMA WINE', category: 'Wine', sizeML: 750, casePack: 12, sellingPrice: 526, active: true },
  { productId: 'PRD-000083', name: 'BOMBAY SAP LON DRY GIN', category: 'Gin', sizeML: 750, casePack: 12, sellingPrice: 2373, active: true },
  { productId: 'PRD-000264', name: 'ROULETTE LONDON DRY GIN', category: 'Gin', sizeML: 750, casePack: 12, sellingPrice: 1160, active: true },
  { productId: 'PRD-000033', name: 'BREEZER BLACKBERRY FLAV', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000085', name: 'BREEZER BLUEBERRY FLAV', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000086', name: 'BREEZER BOLD GUAVA CHILLI', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 135, active: true },
  { productId: 'PRD-000032', name: 'BREEZER CRANBERRY', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000088', name: 'BREEZER JAMAICAN FLAV', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000089', name: 'BREEZER LEMONADE', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000090', name: 'BREEZER MANGOPEACH FLAV', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000091', name: 'BREEZER ORANGE', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000092', name: 'BREEZER WATERMELON FLAV', category: 'Liqueurs', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000318', name: 'BUZZBALLZ GUAVA AROMATIZD', category: 'Liqueurs', sizeML: 180, casePack: 48, sellingPrice: 119, active: true },
  { productId: 'PRD-000158', name: 'JAGERMEISTER', category: 'Liqueurs', sizeML: 750, casePack: 12, sellingPrice: 4013, active: true },
  { productId: 'PRD-000159', name: 'JAGERMEISTER', category: 'Liqueurs', sizeML: 50, casePack: 120, sellingPrice: 384, active: true },
  { productId: 'PRD-000322', name: 'PLUNGE FLOVERS', category: 'Liqueurs', sizeML: 330, casePack: 24, sellingPrice: 135, active: true },
  { productId: 'PRD-000305', name: 'THE WEARHOUSE TEQUILA', category: 'Liqueurs', sizeML: 750, casePack: 12, sellingPrice: 1350, active: true },
  { productId: 'PRD-000306', name: 'THE WEARHOUSE TEQUILA', category: 'Liqueurs', sizeML: 60, casePack: 150, sellingPrice: 120, active: true },
  { productId: 'PRD-000087', name: 'BREEZER CLASSIC FLAVOUR', category: 'Others', sizeML: 275, casePack: 24, sellingPrice: 110, active: true },
  { productId: 'PRD-000038', name: '7UP', category: 'Soft Drinks', sizeML: 600, casePack: 24, sellingPrice: 0, active: true },
  { productId: 'PRD-000039', name: '7UP', category: 'Soft Drinks', sizeML: 400, casePack: 30, sellingPrice: 0, active: true },
  { productId: 'PRD-000046', name: 'AQUAFINA', category: 'Soft Drinks', sizeML: 1000, casePack: 12, sellingPrice: 0, active: true },
  { productId: 'PRD-000100', name: 'CAMPA', category: 'Soft Drinks', sizeML: 1000, casePack: 12, sellingPrice: 0, active: true },
  { productId: 'PRD-000101', name: 'CAMPA', category: 'Soft Drinks', sizeML: 500, casePack: 24, sellingPrice: 0, active: true },
  { productId: 'PRD-000102', name: 'CAMPA', category: 'Soft Drinks', sizeML: 300, casePack: 24, sellingPrice: 0, active: true },
  { productId: 'PRD-000293', name: 'SODA', category: 'Soft Drinks', sizeML: 500, casePack: 24, sellingPrice: 0, active: true }
];

export const INITIAL_STOCK: Record<string, { godown: number; normal: number; ac: number }> = {
  'PRD-000074': { godown: 468, normal: 100, ac: 43 }, // BLACK PEARL BEER 650ml
  'PRD-000075': { godown: 192, normal: 20, ac: 0 }, // BLACK PEARL BEER 500ml
  'PRD-000082': { godown: 0, normal: 0, ac: 19 }, // BOCA BREEZER JAMUN 275ml
  'PRD-000005': { godown: 228, normal: 6, ac: 0 }, // BUDWEISER KING OF BEER 650ml
  'PRD-000095': { godown: 72, normal: 0, ac: 7 }, // BUDWEISER KING OF BEER 500ml
  'PRD-000004': { godown: 0, normal: 33, ac: 27 }, // BUDWEISER MAGNUM BEER 650ml
  'PRD-000096': { godown: 12, normal: 0, ac: 0 }, // BUDWEISER MAGNUM BEER 500ml
  'PRD-000008': { godown: 24, normal: 0, ac: 0 }, // CORONA EXTRA PREMIUM BEER 330ml
  'PRD-000122': { godown: 24, normal: 19, ac: 0 }, // DISCO PANDA LEMON SHANDY 330ml
  'PRD-000126': { godown: 96, normal: 12, ac: 0 }, // FOSTER GOLD STRONG BEER 650ml
  'PRD-000319': { godown: 48, normal: 0, ac: 0 }, // FOSTER GOLD STRONG BEER 500ml
  'PRD-000127': { godown: 61, normal: 14, ac: 0 }, // FOSTERS PUNCH STRONG 650ml
  'PRD-000132': { godown: 36, normal: 17, ac: 0 }, // GOD FATHER 650ml
  'PRD-000133': { godown: 48, normal: 41, ac: 0 }, // GOD FATHER 500ml
  'PRD-000150': { godown: 216, normal: 60, ac: 17 }, // HAYWARDS 5000 STRONG BEER 650ml
  'PRD-000151': { godown: 480, normal: 60, ac: 33 }, // HAYWARDS 5000 STRONG BEER 500ml
  'PRD-000007': { godown: 48, normal: 2, ac: 0 }, // HEINEKEN LAGER BEER 650ml
  'PRD-000328': { godown: 0, normal: 9, ac: 0 }, // HEINEKEN LAGER BEER 330ml
  'PRD-000002': { godown: 84, normal: 12, ac: 0 }, // KINGFISHER LAGER BEER 650ml
  'PRD-000179': { godown: 48, normal: 15, ac: 5 }, // KINGFISHER LAGER BEER 500ml
  'PRD-000001': { godown: 336, normal: 194, ac: 80 }, // KINGFISHER STRONG BEER 650ml
  'PRD-000180': { godown: 1680, normal: 254, ac: 22 }, // KINGFISHER STRONG BEER 500ml
  'PRD-000181': { godown: 72, normal: 11, ac: 0 }, // KINGFISHER ULTRAMAX 650ml
  'PRD-000257': { godown: 36, normal: 12, ac: 0 }, // PEOPLES PONDICHERRY 650ml
  'PRD-000258': { godown: 24, normal: 0, ac: 0 }, // PEOPLES PONDICHERRY 330ml
  'PRD-000260': { godown: 72, normal: 28, ac: 0 }, // PURSUE HARD SELTZER 500ml
  'PRD-000009': { godown: 456, normal: 0, ac: 0 }, // TUBORG STRONG BEER 650ml
  'PRD-000308': { godown: 96, normal: 0, ac: 0 }, // TUBORG STRONG BEER 500ml
  'PRD-000037': { godown: 0, normal: 13, ac: 0 }, // 1848 XO BRANDY 750ml
  'PRD-000044': { godown: 0, normal: 5, ac: 0 }, // ANTIQUITY XO BLENDED BDY 750ml
  'PRD-000045': { godown: 0, normal: 70, ac: 9 }, // ANTIQUITY XO BLENDED BDY 90ml
  'PRD-000064': { godown: 6, normal: 2, ac: 0 }, // BLACK & GOLD VSOP BRANDY 2000ml
  'PRD-000065': { godown: 9, normal: 12, ac: 0 }, // BLACK & GOLD VSOP BRANDY 1000ml
  'PRD-000066': { godown: 12, normal: 15, ac: 9 }, // BLACK & GOLD VSOP BRANDY 750ml
  'PRD-000067': { godown: 384, normal: 70, ac: 0 }, // BLACK & GOLD VSOP BRANDY 90ml
  'PRD-000078': { godown: 0, normal: 10, ac: 0 }, // BLUE GRAP 750ml
  'PRD-000080': { godown: 0, normal: 10, ac: 0 }, // BLUE GRAPE FRENCH BDY 750ml
  'PRD-000081': { godown: 384, normal: 43, ac: 16 }, // BLUE GRAPE FRENCH BDY 90ml
  'PRD-000115': { godown: 0, normal: 4, ac: 0 }, // CLOVIS XO BRANDY 750ml
  'PRD-000116': { godown: 0, normal: 50, ac: 0 }, // CLOVIS XO BRANDY 60ml
  'PRD-000326': { godown: 0, normal: 3, ac: 0 }, // COLONIAL PREMIUM VSOP BDY 750ml
  'PRD-000117': { godown: 27, normal: 11, ac: 0 }, // COURRIER NAPOLEAN 1000ml
  'PRD-000016': { godown: 48, normal: 30, ac: 8 }, // COURRIER NAPOLEAN 750ml
  'PRD-000118': { godown: 288, normal: 188, ac: 78 }, // COURRIER NAPOLEAN 90ml
  'PRD-000119': { godown: 24, normal: 1, ac: 2 }, // COURRIER NAPOLEAN GREEN 750ml
  'PRD-000120': { godown: 480, normal: 128, ac: 88 }, // COURRIER NAPOLEAN GREEN 90ml
  'PRD-000327': { godown: 0, normal: 4, ac: 0 }, // DAVID LOUIS XO BDY 750ml
  'PRD-000128': { godown: 0, normal: 3, ac: 0 }, // GEO'S PREMIER LEAGUE XO 750ml
  'PRD-000130': { godown: 36, normal: 15, ac: 0 }, // GOA XXX VSOP IND 750ml
  'PRD-000131': { godown: 384, normal: 17, ac: 0 }, // GOA XXX VSOP IND 90ml
  'PRD-000134': { godown: 27, normal: 3, ac: 0 }, // GOLD BISCUIT BRANDY 1000ml
  'PRD-000135': { godown: 120, normal: 10, ac: 0 }, // GOLD BISCUIT BRANDY 750ml
  'PRD-000136': { godown: 1536, normal: 4, ac: 0 }, // GOLD BISCUIT BRANDY 90ml
  'PRD-000139': { godown: 0, normal: 7, ac: 0 }, // GOLD BISCUIT VSOP 1000ml
  'PRD-000140': { godown: 12, normal: 7, ac: 0 }, // GOLD BISCUIT VSOP 750ml
  'PRD-000141': { godown: 384, normal: 81, ac: 0 }, // GOLD BISCUIT VSOP 90ml
  'PRD-000142': { godown: 0, normal: 8, ac: 0 }, // GOLD BISCUIT XO BDY 750ml
  'PRD-000144': { godown: 0, normal: 72, ac: 0 }, // GOLDEN BALLET VSOP 90ml
  'PRD-000145': { godown: 12, normal: 4, ac: 9 }, // GOLDEN TOUCH 24CARAT BDY 750ml
  'PRD-000146': { godown: 192, normal: 15, ac: 68 }, // GOLDEN TOUCH 24CARAT BDY 90ml
  'PRD-000147': { godown: 0, normal: 3, ac: 0 }, // GRAYSONS INDIAN BRANDY 750ml
  'PRD-000154': { godown: 0, normal: 12, ac: 0 }, // HOBSON XR BRANDY 750ml
  'PRD-000155': { godown: 0, normal: 38, ac: 9 }, // HOBSON XR BRANDY 60ml
  'PRD-000163': { godown: 0, normal: 13, ac: 0 }, // JEFFERIES BRANDY 1000ml
  'PRD-000164': { godown: 132, normal: 28, ac: 0 }, // JEFFERIES BRANDY 750ml
  'PRD-000165': { godown: 960, normal: 768, ac: 0 }, // JEFFERIES BRANDY 90ml
  'PRD-000166': { godown: 12, normal: 8, ac: 11 }, // JEFFERIES GOLD FIN VSOP 750ml
  'PRD-000168': { godown: 0, normal: 11, ac: 0 }, // JEFFERIES RESERVE XO BDY 750ml
  'PRD-000169': { godown: 0, normal: 31, ac: 0 }, // JEFFERIES RESERVE XO BDY 90ml
  'PRD-000174': { godown: 0, normal: 4, ac: 0 }, // JOHNS MONT CASTLE BRANDY 750ml
  'PRD-000175': { godown: 0, normal: 26, ac: 0 }, // JOHNS MONT CASTLE BRANDY 90ml
  'PRD-000177': { godown: 12, normal: 11, ac: 0 }, // KING LOUIS XO BRANDY 750ml
  'PRD-000178': { godown: 308, normal: 29, ac: 3 }, // KING LOUIS XO BRANDY 90ml
  'PRD-000184': { godown: 0, normal: 1, ac: 0 }, // LA FRANZ PREMIUM BRANDYC7 750ml
  'PRD-000185': { godown: 0, normal: 11, ac: 0 }, // LA MARTINE BDY 750ml
  'PRD-000205': { godown: 0, normal: 11, ac: 0 }, // MANSION HOUSE 2000ml
  'PRD-000206': { godown: 36, normal: 8, ac: 0 }, // MANSION HOUSE 1000ml
  'PRD-000207': { godown: 120, normal: 21, ac: 5 }, // MANSION HOUSE 750ml
  'PRD-000208': { godown: 0, normal: 0, ac: 77 }, // MANSION HOUSE 90ml
  'PRD-000209': { godown: 18, normal: 0, ac: 0 }, // MANSION HOUSE FRENCH BDY 2000ml
  'PRD-000011': { godown: 0, normal: 54, ac: 0 }, // MANSION HOUSE FRENCH BDY 90ml
  'PRD-000212': { godown: 48, normal: 15, ac: 0 }, // MANSION HOUSE LEMON WHITE 750ml
  'PRD-000213': { godown: 96, normal: 72, ac: 0 }, // MANSION HOUSE LEMON WHITE 90ml
  'PRD-000214': { godown: 12, normal: 11, ac: 0 }, // MANSION HOUSE ORANGE FLAV 750ml
  'PRD-000215': { godown: 0, normal: 65, ac: 10 }, // MANSION HOUSE ORANGE FLAV 90ml
  'PRD-000222': { godown: 27, normal: 13, ac: 0 }, // MCDOWELLS GOLD INDIAN BDY 1000ml
  'PRD-000223': { godown: 96, normal: 16, ac: 9 }, // MCDOWELLS GOLD INDIAN BDY 750ml
  'PRD-000224': { godown: 1824, normal: 500, ac: 63 }, // MCDOWELLS GOLD INDIAN BDY 90ml
  'PRD-000225': { godown: 6, normal: 5, ac: 0 }, // MCDOWELLS VSOP DELUXE BDY 2000ml
  'PRD-000226': { godown: 27, normal: 6, ac: 0 }, // MCDOWELLS VSOP DELUXE BDY 1000ml
  'PRD-000014': { godown: 48, normal: 6, ac: 12 }, // MCDOWELLS VSOP DELUXE BDY 750ml
  'PRD-000227': { godown: 288, normal: 85, ac: 69 }, // MCDOWELLS VSOP DELUXE BDY 90ml
  'PRD-000228': { godown: 12, normal: 15, ac: 0 }, // MENS BLACK DELUXE BRANDY 750ml
  'PRD-000012': { godown: 12, normal: 8, ac: 4 }, // MORPHEUS XO BDY 750ml
  'PRD-000013': { godown: 28, normal: 82, ac: 50 }, // MORPHEUS XO BDY 60ml
  'PRD-000231': { godown: 12, normal: 12, ac: 6 }, // MORPHEUS XO BLUE BRANDY 750ml
  'PRD-000232': { godown: 175, normal: 48, ac: 30 }, // MORPHEUS XO BLUE BRANDY 60ml
  'PRD-000247': { godown: 288, normal: 74, ac: 0 }, // OLD ADMIRAL BRANDY 90ml
  'PRD-000259': { godown: 0, normal: 3, ac: 0 }, // PERE DAVID VSOP 1000ml
  'PRD-000261': { godown: 0, normal: 1, ac: 1 }, // REMY MARTIN VSOP BRANDY 700ml
  'PRD-000267': { godown: 0, normal: 3, ac: 0 }, // ROYAL CHALLANGE BRANDY 750ml
  'PRD-000268': { godown: 0, normal: 45, ac: 0 }, // ROYAL CHALLANGE BRANDY 90ml
  'PRD-000296': { godown: 0, normal: 0, ac: 3 }, // ST REMY VSOP FRENCH BDY 700ml
  'PRD-000297': { godown: 0, normal: 1, ac: 0 }, // ST REMY XO FRENCH BRANDY 700ml
  'PRD-000298': { godown: 0, normal: 3, ac: 0 }, // ST.BERNARD NAPOLEAN BDY 1000ml
  'PRD-000300': { godown: 108, normal: 15, ac: 0 }, // SUPER SELECT BDY 750ml
  'PRD-000301': { godown: 1344, normal: 288, ac: 0 }, // SUPER SELECT BDY 90ml
  'PRD-000313': { godown: 0, normal: 3, ac: 0 }, // X'TASY GOLD VSOP BRANDY 750ml
  'PRD-000314': { godown: 0, normal: 9, ac: 0 }, // XCLAMATION BRANDY 750ml
  'PRD-000317': { godown: 0, normal: 3, ac: 0 }, // ZIMRA XTRA BDY 750ml
  'PRD-000021': { godown: 0, normal: 1, ac: 0 }, // ANTIQUITY BLUE WHY 750ml
  'PRD-000056': { godown: 6, normal: 4, ac: 1 }, // BALLANTINE'S SCOTCH WHY 750ml
  'PRD-000057': { godown: 0, normal: 0, ac: 13 }, // BALLANTINE'S SCOTCH WHY 50ml
  'PRD-000068': { godown: 0, normal: 5, ac: 0 }, // BLACK & WHITE SCOTCH WHY 750ml
  'PRD-000069': { godown: 0, normal: 5, ac: 0 }, // BLACK & WHITE SCOTCH WHY 60ml
  'PRD-000070': { godown: 0, normal: 3, ac: 0 }, // BLACK DOG SCOTCH WHISKY 2000ml
  'PRD-000022': { godown: 0, normal: 9, ac: 0 }, // BLACK DOG SCOTCH WHISKY 750ml
  'PRD-000071': { godown: 25, normal: 24, ac: 0 }, // BLACK DOG SCOTCH WHISKY 60ml
  'PRD-000072': { godown: 0, normal: 2, ac: 0 }, // BLACK DOG TRI GOLD SCOWHY 750ml
  'PRD-000073': { godown: 0, normal: 9, ac: 0 }, // BLACK DOG TRI GOLD SCOWHY 60ml
  'PRD-000019': { godown: 0, normal: 0, ac: 1 }, // BLENDERS PRIDE WHISKY 60ml
  'PRD-000076': { godown: 0, normal: 7, ac: 0 }, // BLENDERSPRIDE RESERVE WHY 750ml
  'PRD-000104': { godown: 0, normal: 1, ac: 1 }, // CHIVAS REGAL 12YO SCOTCH 750ml
  'PRD-000121': { godown: 0, normal: 3, ac: 0 }, // DEWARS BLE SCO WHY 750ml
  'PRD-000156': { godown: 0, normal: 2, ac: 1 }, // JACK DANIELS 750ml
  'PRD-000329': { godown: 0, normal: 1, ac: 0 }, // JACK DANIELS ORG HONEY 750ml
  'PRD-000161': { godown: 0, normal: 2, ac: 0 }, // JAMESON TRI DIS IRISH WHY 750ml
  'PRD-000170': { godown: 0, normal: 1, ac: 1 }, // JIM BEAM KENT BOURBON WHY 750ml
  'PRD-000171': { godown: 6, normal: 6, ac: 2 }, // JOHNNIE WALKER BLACK 750ml
  'PRD-000172': { godown: 0, normal: 36, ac: 19 }, // JOHNNIE WALKER BLACK 50ml
  'PRD-000024': { godown: 0, normal: 12, ac: 1 }, // JOHNNIE WALKER RED 750ml
  'PRD-000173': { godown: 0, normal: 16, ac: 0 }, // JOHNNIE WALKER RED 50ml
  'PRD-000216': { godown: 0, normal: 9, ac: 0 }, // MANSION HOUSE WHISKY 750ml
  'PRD-000217': { godown: 0, normal: 79, ac: 0 }, // MANSION HOUSE WHISKY 90ml
  'PRD-000221': { godown: 0, normal: 23, ac: 0 }, // MC DOWELLS RESERVE OG WHY 90ml
  'PRD-000263': { godown: 0, normal: 12, ac: 0 }, // ROCK WHISKY 750ml
  'PRD-000266': { godown: 0, normal: 4, ac: 0 }, // ROULETTE UNPEATED PRE WHY 750ml
  'PRD-000269': { godown: 0, normal: 4, ac: 0 }, // ROYAL CHALLENGE WHISKY 2000ml
  'PRD-000270': { godown: 1, normal: 9, ac: 2 }, // ROYAL CHALLENGE WHISKY 750ml
  'PRD-000271': { godown: 0, normal: 34, ac: 14 }, // ROYAL CHALLENGE WHISKY 90ml
  'PRD-000017': { godown: 0, normal: 1, ac: 0 }, // ROYAL STAG DOUBLE DARK 750ml
  'PRD-000273': { godown: 0, normal: 1, ac: 0 }, // SEAGRAM ROYAL STAG BARREL 750ml
  'PRD-000323': { godown: 0, normal: 96, ac: 0 }, // SEAGRAM ROYAL STAG BARREL 90ml
  'PRD-000274': { godown: 18, normal: 3, ac: 2 }, // SEAGRAMS IMERIAL BLUE 750ml
  'PRD-000276': { godown: 0, normal: 4, ac: 0 }, // SEAGRAMS ROYAL STAG 2000ml
  'PRD-000277': { godown: 0, normal: 10, ac: 4 }, // SEAGRAMS ROYAL STAG 750ml
  'PRD-000324': { godown: 96, normal: 19, ac: 0 }, // SEAGRAMS ROYAL STAG 90ml
  'PRD-000278': { godown: 25, normal: 0, ac: 0 }, // SEAGRAMS ROYAL STAG 60ml
  'PRD-000325': { godown: 12, normal: 10, ac: 0 }, // SEGRAMS 100 PIPERS SCH WH 750ml
  'PRD-000279': { godown: 125, normal: 0, ac: 0 }, // SEGRAMS 100 PIPERS SCH WH 60ml
  'PRD-000280': { godown: 3, normal: 2, ac: 1 }, // SEGRAMS PRIDE RESERVE WHY 750ml
  'PRD-000283': { godown: 0, normal: 4, ac: 0 }, // SIGNATURE RARE AGED WHY 2000ml
  'PRD-000284': { godown: 0, normal: 6, ac: 0 }, // SIGNATURE RARE AGED WHY 1000ml
  'PRD-000020': { godown: 0, normal: 12, ac: 1 }, // SIGNATURE RARE AGED WHY 750ml
  'PRD-000302': { godown: 0, normal: 0, ac: 1 }, // TEACHERS 50 BL SCO WHY 750ml
  'PRD-000310': { godown: 0, normal: 5, ac: 0 }, // VAT 69 BLENDED SCOTCH WHY 750ml
  'PRD-000311': { godown: 0, normal: 0, ac: 10 }, // VAT 69 BLENDED SCOTCH WHY 60ml
  'PRD-000312': { godown: 0, normal: 6, ac: 0 }, // WHISTLER BAR AGED WKY 750ml
  'PRD-000316': { godown: 12, normal: 3, ac: 0 }, // XCLAMATION WHYSKY 750ml
  'PRD-000040': { godown: 0, normal: 1, ac: 0 }, // ABSOLUT LEMON FLAV 750ml
  'PRD-000041': { godown: 0, normal: 2, ac: 1 }, // ABSOLUT VODKA 750ml
  'PRD-000058': { godown: 6, normal: 0, ac: 4 }, // BALLET BLUE VODKA MOJITO 750ml
  'PRD-000059': { godown: 0, normal: 27, ac: 0 }, // BALLET BLUE VODKA MOJITO 60ml
  'PRD-000062': { godown: 30, normal: 8, ac: 0 }, // BALLET PINK VODKA 750ml
  'PRD-000105': { godown: 84, normal: 20, ac: 0 }, // CHRIS GUAVA VODKA 750ml
  'PRD-000108': { godown: 288, normal: 102, ac: 0 }, // CHRIS LEMON VODKA 90ml
  'PRD-000112': { godown: 192, normal: 0, ac: 0 }, // CHRIS ORANGE VODKA 90ml
  'PRD-000114': { godown: 49, normal: 0, ac: 0 }, // CHRIS WATERMELON VODKA 90ml
  'PRD-000162': { godown: 0, normal: 9, ac: 0 }, // JAZZ BLUE VODKA 750ml
  'PRD-000187': { godown: 54, normal: 10, ac: 0 }, // M2 JAMUNSPICYMINTFL VODKA 750ml
  'PRD-000188': { godown: 0, normal: 5, ac: 0 }, // M2 MAGIC CRANBERRY TEASE 750ml
  'PRD-000189': { godown: 525, normal: 114, ac: 31 }, // M2 NEWREMIX FLAV.ORANGE 60ml
  'PRD-000320': { godown: 6, normal: 0, ac: 0 }, // M2 PREM GRAIN VODKA 750ml
  'PRD-000029': { godown: 20, normal: 12, ac: 0 }, // MAGIC MOMENTS FLAVOUR 750ml
  'PRD-000203': { godown: 0, normal: 0, ac: 2 }, // MAGIC MOMENTS VIVID PINK 750ml
  'PRD-000235': { godown: 0, normal: 0, ac: 3 }, // NEON VODKA APPLE 750ml
  'PRD-000236': { godown: 4, normal: 0, ac: 0 }, // NEON VODKA APPLE 90ml
  'PRD-000237': { godown: 84, normal: 35, ac: 0 }, // NEON VODKA FLAVOUR 750ml
  'PRD-000238': { godown: 304, normal: 310, ac: 25 }, // NEON VODKA FLAVOUR 90ml
  'PRD-000240': { godown: 4, normal: 0, ac: 0 }, // NEON VODKA GUAVA 90ml
  'PRD-000252': { godown: 0, normal: 2, ac: 0 }, // OXYGEN APPLE VODKA 750ml
  'PRD-000253': { godown: 0, normal: 20, ac: 0 }, // OXYGEN APPLE VODKA 90ml
  'PRD-000254': { godown: 0, normal: 2, ac: 0 }, // OXYZEN ORANGE VODKA 750ml
  'PRD-000255': { godown: 0, normal: 3, ac: 0 }, // OXYZEN VANILLA VODKA 750ml
  'PRD-000256': { godown: 0, normal: 6, ac: 0 }, // OXYZEN VODKA 750ml
  'PRD-000262': { godown: 0, normal: 7, ac: 2 }, // RESOLUTE PINK VODKA 750ml
  'PRD-000286': { godown: 0, normal: 22, ac: 0 }, // SMIRNOFF APPLE VODKA 60ml
  'PRD-000287': { godown: 24, normal: 9, ac: 0 }, // SMIRNOFF MINT JAMUN VODKA 750ml
  'PRD-000289': { godown: 0, normal: 7, ac: 0 }, // SMIRNOFF ORANGE VODKA 750ml
  'PRD-000030': { godown: 0, normal: 6, ac: 0 }, // SMIRNOFF TRIPLE DIS VODKA 750ml
  'PRD-000291': { godown: 0, normal: 11, ac: 0 }, // SMIRNOFF TRIPLE DIS VODKA 60ml
  'PRD-000292': { godown: 1, normal: 0, ac: 0 }, // SMIRNOFF ZESTY LIME VODKA 750ml
  'PRD-000047': { godown: 6, normal: 4, ac: 0 }, // BACARDI BLACK RUM 750ml
  'PRD-000027': { godown: 0, normal: 8, ac: 0 }, // BACARDI CARTA WHITE RUM 750ml
  'PRD-000048': { godown: 0, normal: 3, ac: 0 }, // BACARDI GINGER RUM 750ml
  'PRD-000049': { godown: 0, normal: 11, ac: 0 }, // BACARDI GUAVA RUM 750ml
  'PRD-000028': { godown: 12, normal: 16, ac: 0 }, // BACARDI LEMON RUM 750ml
  'PRD-000050': { godown: 325, normal: 40, ac: 46 }, // BACARDI LEMON RUM 60ml
  'PRD-000051': { godown: 0, normal: 12, ac: 0 }, // BACARDI MANGO CHILI RUM 750ml
  'PRD-000052': { godown: 3, normal: 0, ac: 0 }, // BACARDI ORANGE RUM 750ml
  'PRD-000053': { godown: 175, normal: 0, ac: 0 }, // BACARDI ORANGE RUM 60ml
  'PRD-000054': { godown: 0, normal: 2, ac: 0 }, // BACARDI ORO GOLD RUM 750ml
  'PRD-000098': { godown: 0, normal: 17, ac: 0 }, // CABO WHITE RUM 750ml
  'PRD-000099': { godown: 50, normal: 29, ac: 0 }, // CABO WHITE RUM 60ml
  'PRD-000137': { godown: 0, normal: 10, ac: 0 }, // GOLD BISCUIT RUM 750ml
  'PRD-000153': { godown: 0, normal: 6, ac: 0 }, // HERCULES DELUXE 3X RUM 750ml
  'PRD-000248': { godown: 0, normal: 9, ac: 0 }, // OLD MONK APPLE RUM 750ml
  'PRD-000249': { godown: 0, normal: 10, ac: 1 }, // OLD MONK COFFEE RUM 750ml
  'PRD-000250': { godown: 0, normal: 9, ac: 0 }, // OLD MONK LEGEND RUM 750ml
  'PRD-000251': { godown: 0, normal: 0, ac: 9 }, // OLD MONK LEMON RUM 750ml
  'PRD-000025': { godown: 48, normal: 18, ac: 11 }, // OLD MONK RUM 750ml
  'PRD-000026': { godown: 600, normal: 108, ac: 6 }, // OLD MONK RUM 90ml
  'PRD-000321': { godown: 12, normal: 0, ac: 0 }, // OLD MONK WHITE RUM 750ml
  'PRD-000315': { godown: 0, normal: 3, ac: 0 }, // XCLAMATION RUM 750ml
  'PRD-000034': { godown: 12, normal: 13, ac: 0 }, // 100 BARRELS PORT WINE 750ml
  'PRD-000035': { godown: 0, normal: 68, ac: 0 }, // 100 BARRELS PORT WINE 180ml
  'PRD-000077': { godown: 48, normal: 38, ac: 0 }, // BLUE BIRD PORT WINE 180ml
  'PRD-000084': { godown: 24, normal: 26, ac: 0 }, // BOROKA FORBIDDEN APPLE 330ml
  'PRD-000094': { godown: 36, normal: 8, ac: 0 }, // BRO CODE KRAFT 250ml
  'PRD-000124': { godown: 0, normal: 7, ac: 0 }, // ELITE PLANTINUM WINE 750ml
  'PRD-000125': { godown: 48, normal: 35, ac: 0 }, // ELITE PLANTINUM WINE 180ml
  'PRD-000157': { godown: 0, normal: 3, ac: 0 }, // JACOBS CREEK SHIRAZ WINE 750ml
  'PRD-000233': { godown: 0, normal: 13, ac: 0 }, // MUMTAJ GRAPE WINE 750ml
  'PRD-000234': { godown: 0, normal: 42, ac: 0 }, // MUMTAJ GRAPE WINE 180ml
  'PRD-000272': { godown: 0, normal: 5, ac: 0 }, // SAMARA RED WINE 750ml
  'PRD-000281': { godown: 12, normal: 8, ac: 0 }, // SIDUS PREMIUM RED WINE 750ml
  'PRD-000282': { godown: 48, normal: 13, ac: 0 }, // SIDUS PREMIUM RED WINE 180ml
  'PRD-000294': { godown: 24, normal: 0, ac: 0 }, // SONIC BLACK 330ml
  'PRD-000299': { godown: 0, normal: 1, ac: 0 }, // SULA CHENIN WHITE WINE 750ml
  'PRD-000031': { godown: 0, normal: 3, ac: 2 }, // SULA SHRIAZ CABERNET RED 750ml
  'PRD-000307': { godown: 0, normal: 2, ac: 0 }, // TINTO CASHEW FENI 750ml
  'PRD-000309': { godown: 0, normal: 9, ac: 0 }, // VASCODAGAMA WINE 750ml
  'PRD-000083': { godown: 0, normal: 3, ac: 1 }, // BOMBAY SAP LON DRY GIN 750ml
  'PRD-000264': { godown: 0, normal: 2, ac: 1 }, // ROULETTE LONDON DRY GIN 750ml
  'PRD-000086': { godown: 96, normal: 13, ac: 0 }, // BREEZER BOLD GUAVA CHILLI 275ml
  'PRD-000032': { godown: 192, normal: 56, ac: 22 }, // BREEZER CRANBERRY 275ml
  'PRD-000318': { godown: 48, normal: 22, ac: 48 }, // BUZZBALLZ GUAVA AROMATIZD 180ml
  'PRD-000158': { godown: 0, normal: 3, ac: 1 }, // JAGERMEISTER 750ml
  'PRD-000159': { godown: 0, normal: 34, ac: 0 }, // JAGERMEISTER 50ml
  'PRD-000322': { godown: 48, normal: 24, ac: 0 }, // PLUNGE FLOVERS 330ml
  'PRD-000306': { godown: 0, normal: 34, ac: 0 }, // THE WEARHOUSE TEQUILA 60ml
  'PRD-000087': { godown: 144, normal: 24, ac: 0 }, // BREEZER CLASSIC FLAVOUR 275ml
  'PRD-000038': { godown: 0, normal: 30, ac: 0 }, // 7UP 600ml
  'PRD-000039': { godown: 0, normal: 71, ac: 0 }, // 7UP 400ml
  'PRD-000046': { godown: 0, normal: 12, ac: 0 }, // AQUAFINA 1000ml
  'PRD-000100': { godown: 0, normal: 264, ac: 0 }, // CAMPA 1000ml
  'PRD-000101': { godown: 0, normal: 102, ac: 0 }, // CAMPA 500ml
  'PRD-000102': { godown: 0, normal: 144, ac: 0 }, // CAMPA 300ml
  'PRD-000293': { godown: 0, normal: 11, ac: 0 }  // SODA 500ml
};

export const INITIAL_DROPDOWN_OPTIONS: DropdownOption[] = [
  { optionId: 'OPT-001', type: 'EXPENSE', value: 'Cleaning & Sanitation Supplies', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-002', type: 'EXPENSE', value: 'Ice Blocks & Cubes', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-003', type: 'EXPENSE', value: 'Electricity & Generator Diesel', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-004', type: 'EXPENSE', value: 'Packaging & Carry Bags', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-005', type: 'EXPENSE', value: 'Snacks & Side Items for Bar', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-006', type: 'EXPENSE', value: 'Water Cans & Mineral Water', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-007', type: 'EXPENSE', value: 'Licence & Municipal Charges', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-008', type: 'WAGE', value: 'Murugan (Normal Cashier)', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-009', type: 'WAGE', value: 'Senthil (Normal Helper)', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-010', type: 'WAGE', value: 'Karthik (AC Cashier)', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-011', type: 'WAGE', value: 'Ramesh (AC Helper)', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-012', type: 'WAGE', value: 'Prakash (Godown Supervisor)', active: true, createdAt: '2026-01-01' },
  { optionId: 'OPT-013', type: 'WAGE', value: 'Sundar (Night Security)', active: true, createdAt: '2026-01-01' }
];

export function matchesSearchQuery(query: string, ...fields: (string | number | undefined | null)[]): boolean {
  const q = String(query || '').trim().toLocaleLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = fields.map(f => String(f ?? '')).join(' ').toLocaleLowerCase();
  return tokens.every(tok => haystack.includes(tok));
}

