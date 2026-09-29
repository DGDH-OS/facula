/**
 * Vaste lijst veelvoorkomende Nederlandse voornamen, geen leerlingenbestand.
 * Detectie is exact token na normalisatie. Een zeldzame naam kan erdoorheen.
 */
const RAW = `
  aaliyah aaron abby abigail abraham adam adanna adelheid adriaan adrian adrianus
  aisha ajay alan albert alec alejandro alex alexander alexandra alexis alfred ali
  alice alicia alina alisha alissa aliyah alma amara amelia amina amir amira amy
  anas anders andre andreas andrew andy angel angela aniek anika anisa anisha anja
  anke ann anna annabel annabelle anne anneke annemarie annemiek annemieke annet
  annette annie anouk antoine anton antonia antonio anwar arian arianne arie arjen
  arnoud arnoud arnoud arthur asher ashton asma asya athena aya ayana ayden ayla
  aylin ayoub ayoub azra
  barbara bart bas bastiaan beau belinda benja benjamin bent bente benthe bernadette
  bernard bert bibi bianca bjorn bo boaz bob bobby bodhi bonnie boris boudewijn
  bram brandon briana brian brigitte brit britta brody bruce bruno bryan
  carla carlijn carmen carol carolina caroline carolien cas casper cataleya cathy
  catrin cecile celeste celia cem cemre chad charlie charlotte chen chantal chiara
  chris christel christiaan christian christina christine christopher cindy claudia
  cleo colin conner connie cor cora cornelis cornelia crystal
  daan daisy damian damien dan dana daniel daniella danielle danique danny daphne
  dave david dean deborah denise dennis derek destin devin dex diana diederik
  diederick diederik dieke dillon dimitri dina dirk dominic dominique don donald
  dorian doris doug douglas duuk dylan
  evelyn eddy edgar edith eduard edward edwin eef eefje elena elias elin elina elisa
  elisabeth elise eliza elizabeth elize ellen ellie elly elsa elsbeth elvira elyan
  elyana elyse emilia emilian emily emin emma emmanuel emre emy enzo eric erik erin
  ernest ernst esmee esmé esther ethan etienne eva evelien eveline evelyn evi evie
  evy ezra
  fabian farah faris fatima fatma faye felice felicia felix fem femke fenne fenn
  fenne fennick ferdi fernando fien fienne filip filippo finley finn fiona fleur
  floor floris francesco frank frankie franklin frans frédéric frederik freek
  freya frida
  gabriel gabriella gabrielle gabriëlle gaye geert geerte geertruida genevieve
  georg george georgina gerard gerben gerda gerrit gina giorgio gijs gijsbert
  gillian gio giovanni glenn grace greg gregor gregory guus guy
  hailey hamza hana hanan hanne hanneke hans harm harriet harry hasan hassan hatice
  hayley heather hein helen helena helene helga hendrik hendrika henk henri henry
  hester hetty hilary hilde hylke
  ian ibrahim ilyas imaan imane imran ina ineke inge ingmar ingrid irene iris irma
  irvin isaac isabel isabella isabelle ishmael ismail iva ivan ivo ivy iza izabella
  jaap jace jack jackie jackson jacob jacobine jacqueline jade jael jaiden jailey
  jake james jamie jan jane janet janice janie janne janneke jannie janoah jared
  jarno jasmin jasmine jason jasper jay jayden jaylinn jayson jean jeanette jeanne
  jelle jennifer jens jeremy jeroen jerry jerome jesse jessica jessy jip jitte
  joanna joanne joaquin jocelyn joep joeri joey johannes johanna john johnny jokbe
  jolan jolanda jolie jon jonah jonas jonathan joost jordan jorden jorik joris
  josef joseph josephine josh joshua joyce joël juan judith julia julian julie
  juliette julius juna june junior justin justine juul
  kaiden kais kai kaj kamille kane karin karina karlijn kate katelyn katharina
  katherine kathleen kathy katie katrina kay kaylee kayleigh keano kees keith kelly
  kevin khalid kian kiara kim kimberly kira kirill koen koenraad koos kristel kristian
  kristina kyle kyra
  lara larissa lars laura lauren laurens laurens laurent laurie laurens layla lea
  leah leander leandro leila lena lenn lennard lennart lennox leo leon leonard
  leonardo leonardo leonora levi lewis lex liam lianne lieke lieve lilian liliana
  lilly lily lina linda linde lindsay linn linus lisa lisanne lise liselotte liv
  liva livia liz liza lizz lizzy loek loes logan lois lola lore lorenzo lorijn
  lot lotta lotte louie louis louise louth loua luc luca lucas luciano lucie lucy
  ludwig luka lukas luke luna luuk luuk lux lynn lynne
  maaike maarten maartje madeleine mads mae mahir mahmoud maila maira maisie
  maud mara marc marcel marcello marcia marco marcus marek margot margriet marieke
  mariel marielle marijn mariska marit marjolein mark marleen marley marloes marnie
  martha martin martina martine martijn marwa maryam mas mascha mason mats matthew
  matthias matthijs maud maurits max maxim maxima maxime maximiliaan maya mees
  megan mehmet meike melanie melissa melody merel merijn meryem merve mia michael
  michaela michel michele michelle michiel mieke miel mikah mike milan milena milo
  milou mina miranda miriam mirthe mitchell mo mohamed mohammad mohammed mona monica
  monique morris moses mustafa mya mylah
  nabil nadia nadine naima nana naomi nasser natasha nathalie nathan nathanael
  nathalie neal niels nienke nika nike nikki nina nino noa noah noam noel noelle
  noor noortje nora norah noud nout nova nowah nympha
  olive oliver olivia olaf ole omar oscar oscar oscar oscar oscar oscar oscar oscar
  oscar oscar oscar oscar oscar oscar oscar oscar oscar oscar oscar oscar oscar
  otto owen
  pamela paola paris pascal patricia patrick paul paula paulien pauline paulus
  pax pedro perry peter petra petronella philipp philip philippa phoebe pieter
  piet pip piper pippa pixie puck
  quentin quincy quinten quinty quinn
  rachel rafael rafaela ramon rana randall raquel ravi rawan rayan rayane rayen
  rebecca reina reinier remco remi remy renee renée rianne ricardo richard rick
  ricky rida riley rita rob robbie robert robin robyn rochèle roderik roel roelof
  roger roland romee romy ron ronald ronan roos rosa rosalie rose rosemary rosie
  rowan roy ruben ruby rudy rutger ruth ryan
  sabrina saida salma sam samantha sami samira samuel sander sandra sanne sara
  sarah sascha sasha saskia sebastian sebastiaan selena selin selina sem semih
  senna senn serena serge sergio shania shanna sharon shaun shay shayna sienna
  sil silke silvia simon simone sofia sofie sonja sophia sophie stacey stef
  stefan stefanie stella sterre steven stijn storm suus suzan suzanne suze sven
  syb syenna sylvia
  tamara tamar tara tarik tasnim taylor teas teun teunis theo theodora theresa
  thiago thijs thomas tijn tilda tilly tim timo timothy titus tjeerd tom toma
  tommy ton tony tracy trevor trijntje tristan troi troy tyler
  ulla ulrich uma uriah ursula
  valentina valentijn valerie vanessa vera vernon veronique vesper vicky victor
  victoria vincent viola violet vivian vivienne
  willem willemijn willemina william willow wim winston wojtek wouter
  xander xanthe xavi xavier xenia
  yael yannick yara yareli yasin yasmin yasmine yentl yfke ylva yolanda youri
  youssef yunus yusuf yuval yvonne
  zaid zain zara zayn zef zelda zeynep zoey zoë zoe zoë zohra zola zoe zoe zoe
`.replace(/\s+/g, " ").trim();

export const NEDERLANDSE_VOORNAMEN: ReadonlySet<string> = new Set(
  RAW.split(" ").filter((n) => n.length > 1),
);
