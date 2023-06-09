const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const sass = require("sass");
const ejs = require("ejs");
const { Client } = require("pg");
const formidable=require("formidable");
const {Utilizator}=require("./module_proprii/utilizator.js")
const session=require('express-session');
const Drepturi = require("./module_proprii/drepturi.js");
const AccesBD = require("./module_proprii/accesbd.js");
const { randomInt } = require("crypto");
app = express();
app.set("view engine", "ejs");


obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css"),
    folderBackup: path.join(__dirname, "resurse/backup"),
    optiuniMeniu:[]
}; 


var client= new Client({
    database:"site",
    user:"teo",
    password:"7979",
    host:"localhost",
    port:5432
});11       

client.connect();

client.query("SELECT * FROM unnest(enum_range(null::tipuri_produse_sport))", function(err, rezultat){

    if(err){
        console.log(err);
    }
    else{
        obGlobal.optiuniMeniu=rezultat.rows;
}
});




AccesBD.getInstanta().select({tabel:"produs_sport", campuri:["nume"], conditiiAnd:["id=1"]},
function(err, rez){
    console.log(rez);
    console.log(err);
}
)


console.log("Folder proiect", __dirname);

console.log("Cale fisier", __filename);

console.log("Director de lucru ", process.cwd());

//o sesiune e valabil cat utilizatorul e logat
app.use(session({ // aici se creeaza proprietatea session a requestului (pot folosi req.session)
    secret: 'abcdefg',//folosit de express session pentru criptarea id-ului de sesiune
    resave: true,
    saveUninitialized: false
  }));


vectorFoldere = ["temp", "temp1", "backup","poze_uploadate"]
for (let folder of vectorFoldere) {
    //let caleFolder =__dirname+"/"+folder;
    let caleFolder = path.join(__dirname, folder)
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}
vFisiere = fs.readdirSync(obGlobal.folderScss);
console.log("fisiere:");
console.log(vFisiere);






app.use("/resurse", express.static(__dirname + "/resurse"));

app.use("/poze_uploadate", express.static(__dirname + "/poze_uploadate"));

app.use("/node_modules", express.static(__dirname + "/node_modules"));

app.use("/*", function(req, res, next){ //vector de peste tot in footer
    res.locals.optiuniMeniu = obGlobal.optiuniMeniu;
    res.locals.Drepturi=Drepturi;//trimit si drepturle clientului
    if (req.session.utilizator){//e un utilizator logat?
        req.utilizator=res.locals.utilizator=new Utilizator(req.session.utilizator);//il pun in fisierele ejs ca toate paginile sa il vada
    }  
    next();
})

app.use(/^\/resurse(\/[a-zA-Z0-9]*)*$/, function (req, res) {
    afiseazaEroare(res, 403);
});

//PRODUSEapp.get("/produse", function (req, res) {
    app.get("/produse", function (req, res) {
        client.query(
            "SELECT * FROM unnest(enum_range(null::categ_produs_sport))",
            function (err, rezCategorie) {
              if (err) {
                console.log(err);
                afiseazaEroare(res, 2);
              } else {
                let conditieWhere = "";
                if (req.query.categorie) {
                  conditieWhere = ` WHERE tip_produs='${req.query.categorie}'`;
                }
                client.query(
                  "SELECT * FROM produs_sport" + conditieWhere,
                  function (err, rez) {
                    if (err) {
                      console.log(err);
                      afiseazaEroare(res, 2);
                    } else {
                    client.query(
                      "SELECT MIN(pret) AS min, MAX(pret) AS max FROM produs_sport",
                      function (err, rezPret) {
                        if (err) {
                          console.log(err);
                          afiseazaEroare(res, 2);
                        } else {
                          client.query(
                            "SELECT MIN(greutate) AS min, MAX(greutate) AS max FROM produs_sport",
                            function (err, rezGreutate) {
                              if (err) {
                                console.log(err);
                                afiseazaEroare(res, 2);
                              } else {
                                client.query(
                                  "SELECT DISTINCT unnest(materiale) FROM produs_sport",
                                  function (err, rezMateriale) {
                                    if (err) {
                                      console.log(err);
                                      afiseazaEroare(res, 2);
                                    } else {
                                      client.query(
                                        "SELECT DISTINCT culoare FROM produs_sport",
                                        function (err, rezCuloare) {
                                          if (err) {
                                            console.log(err);
                                            afiseazaEroare(res, 2);
                                          } else {
                                            client.query(
                                              "SELECT DISTINCT testat FROM produs_sport",
                                              function (err, rezTestat) {
                                                if (err) {
                                                  console.log(err);
                                                  afiseazaEroare(res, 2);
                                                } else {
                                                    
                                                  
      
                                                  res.render("pagini/produse", {
                                                    produse: rez.rows,
                                                    minGreutate: rezGreutate.rows[0].min,
                                                    maxGreutate: rezGreutate.rows[0].max,
                                                    medieGreutate: (rezGreutate.rows[0].min + rezGreutate.rows[0].max) / 10,
                                                    minPret: rezPret.rows[0].min,
                                                    maxPret: rezPret.rows[0].max,
                                                    materiale: rezMateriale.rows.map((row) => row.unnest),
                                                    culori: rezCuloare.rows.map((row) => row.culoare),
                                                    testat: rezTestat.rows.map((row) => row.testat), //are sens ca sa nu am multiple instante
                                                    optiuni: rezCategorie.rows
                                                  });
                                                }
                                              }
                                            );
                                          }
                                        }
                                      );
                                    }
                                  }
                                );
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });
      


app.get("/produs/:id",function(req, res){
    console.log(req.params);
    
    client.query(`select * from produs_sport where id=${req.params.id}`, function( err, rezultat){
        if(err){
            console.log(err);
            afiseazaEroare(res, 2);
        }
        else
            res.render("pagini/produs", {prod:rezultat.rows[0]});
    });
});






//submit trimit catre server datele din formular
app.post("/inregistrare",function(req, res){ //intra aici
    var username; 
    var poza; //fara valoare pt toate functiiile fcallback
    console.log("ceva");
    var formular= new formidable.IncomingForm()//definesc obiect de tip formular, o clasa
    formular.parse(req, function(err, campuriText, campuriFisier ){//4 parsez datele din formular doar dupa ce le-a primit pe toate
        //si callback eroare, campuri text, campuri fisier 
        console.log("Inregistrare:",campuriText);

        console.log(campuriFisier);
        var eroare="";

        var utilizNou=new Utilizator(); //obiect nou tip utilizator
        if (campuriText.parola.length < 4) {
            eroare += "Parola trebuie sa contina cel putin 4 caractere. ";
            res.render("pagini/inregistrare", {err: "Eroare: "+eroare});
          }
          if (campuriText.nume.toLowerCase().includes('malefic')) {
            eroare += "Numele nu poate conține combinații negative.";
            res.render("pagini/inregistrare", {err: "Eroare: " + eroare});
          }
    if(eroare == ''){
        try{
            //aici se seteaza camp de camp sa pot face anumite verificari
            console.log(campuriText.nume);

            utilizNou.setareNume=campuriText.nume;//campuriText.nume (adica efectiv name = "username" din formular")
            utilizNou.setareUsername=campuriText.username; //in setter, vine ceea ce e dupa egal
            utilizNou.email=campuriText.email;
            utilizNou.prenume=campuriText.prenume;
            utilizNou.data_adaugare = campuriText.data_adaugare;
            utilizNou.parola=campuriText.parola;
            utilizNou.culoare_chat=campuriText.culoare_chat;
            utilizNou.tema = campuriText.tema;
            utilizNou.poza= poza;
            //functia asta primeste un obiect de tip utilizator, un parametru si o eroare
            Utilizator.getUtilizDupaUsername(campuriText.username, {}, function(u, parametru ,eroareUser ){
                if (eroareUser==-1){//verific ca nu exista username-ul in BD, cauta in tabel user-nameul
                    utilizNou.salvareUtilizator();//daca nu exista, salvez utilizatorul
                }
                else{
                    eroare+="Mai exista username-ul"; //daca exista, eroare
                }

                if(!eroare){ //daca nu am eroare, randez pagina de inregistrare cu un raspuns setat (nu mai afisez formularul)
                    res.render("pagini/inregistrare", {raspuns:"Inregistrare cu succes!"})
                    
                }
                else //randez cu eroarea respectiva
                    res.render("pagini/inregistrare", {err: "Eroare: "+eroare});
            })
            

        }
        catch(e){ 
            console.log(e);
            eroare+= "Eroare site; reveniti mai tarziu";
            console.log(eroare);
            res.render("pagini/inregistrare", {err: "Eroare: "+eroare})
        }
    


    }
    });
    //primrea campurilor, pentru fiecare filed, mai intai text, apoi fisier
    formular.on("field", function(nume,val){  // primul eveniment 1
	
        console.log(`--- ${nume}=${val}`);
		
        if(nume=="username")
            username=val;
    }) 
    //vine un fisier,
    formular.on("fileBegin", function(nume,fisier){ // al 2lea  2
        console.log("fileBegin");
        console.log(nume,fisier);
        //folder cu nume si user pentru poze
        let folderUser=path.join(__dirname, "poze_uploadate",username);

        console.log(folderUser);
        //daca nu exista folderul, il creez
        if (!fs.existsSync(folderUser))
            fs.mkdirSync(folderUser);
        //in folderul a,                      //aici ar trebuii sa modific
        fisier.filepath=path.join(folderUser, fisier.originalFilename)
        //fisierul primeste calea
        poza=fisier.originalFilename

    })    
    formular.on("file", function(nume,fisier){//3 cand s-a terminat uploadul
        console.log("file");
        console.log(nume,fisier);
    }); 
});


app.get("/logout", function(req, res){//utilizatorul isi poate distruge sesiunea
    res.locals.utilizator=null;
    req.session.destroy(); //verific sa golesc si locals
    res.render("pagini/home");
});

//http://${Utilizator.numeDomeniu}/cod/${utiliz.username}/${token}
//[numeDomeniu]/confirmare_mail/[token]/[username]
app.get("/cod/:username/:token",function(req,res){
    console.log(req.params);
    try {
        //am usernameul in link, vreau sa vad daca exista in baza de date, req.params.token
        Utilizator.getUtilizDupaUsername(req.params.username,{res:res,token:req.params.token} ,function(u,obparam){
            AccesBD.getInstanta().update( //dupa ce l-am gasit, fac update in baza de date
                {tabel:"utilizatori",
                campuri:{confirmat_mail:'true'}, 
                conditiiAnd:[`cod='${obparam.token}'`]},
                function (err, rezUpdate){ //callback daca totul e bine randez pagina de confirmare
                    if(err || rezUpdate.rowCount==0){
                        console.log("Cod:", err);
                        afisareEroare(res,3);
                    }
                    else{
                        res.render("pagini/confirmare.ejs");
                    }
                })
        })
    }
    catch (e){
        console.log(e);
        renderError(res,2);
    }
})

app.get("/useri", function (req, res) {

    if (req?.utilizator?.areDreptul?.(Drepturi.vizualizareUtilizatori)) { //are dreptul sa vada utilizatori?
        AccesBD.getInstanta().select({ tabel: "utilizatori", campuri: ["*"] }, function (err, rezQuery) {//daca are dreptul facem un select toate informatiile
            console.log(err);
            res.render("pagini/useri", { useri: rezQuery.rows });//ori avem eroare ori afisam toate randurile din tabel,
        });
    }
    else {
        renderError(res, 403);
    }
});


app.post("/sterge_utiliz", function (req, res) {
    if (req?.utilizator?.areDreptul?.(Drepturi.stergereUtilizatori)) {//daca am dreptu de a sterge
        var formular = new formidable.IncomingForm(); //iau din formular id-ul lui
        formular.parse(req, function (err, campuriText, campuriFile) {//parsez datele din formular
//querry de dlete
            AccesBD.getInstanta().delete({ tabel: "utilizatori", conditiiAnd: [`id=${campuriText.id_utiliz}`] }, function (err, rezQuery) {
                console.log(err);
                res.redirect("/useri");//dupa  iar trimitem pe
            });
        });
    } else {
        renderError(res, 403);
    }
})


//sterge utilizator
Utilizator.stergeUtilizatorDupaId(2);
//cineva da submit la formularul de login
app.post("/login",function(req, res){
    var username;
    console.log("ceva");
    var formular= new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier ){
        Utilizator.getUtilizDupaUsername (campuriText.username,{ //returneaza un obiect din clasa utilizator, si il caut dupa user
            req:req,
            res:res,
            parola:campuriText.parola
        }, function(u, obparam ){ // functia asta luam parola din campuritext, si o criptam, ca sa nu avem parola in clar in baza de date
            let parolaCriptata=Utilizator.criptareParola(obparam.parola);//verfic daca parola din tabel si cea din formular sunt la fel
            if(u.parola==parolaCriptata && u.confirmat_mail ){//verific daca e true, daca da, setez sesiunea
                u.poza=u.poza?path.join("poze_uploadate",u.username, u.poza):"";//creez calea catre poza de profil
                obparam.req.session.utilizator=u;//setez utilizator in request sesion, u care e obiectul de tip utilizator
                
                obparam.req.session.mesajLogin="Bravo! Te-ai logat!"; // daca e ok
                obparam.res.redirect("/despre");//
                //obparam.res.render("/login");
            }
            else{
                console.log("Eroare logare") //daca nu
                obparam.req.session.mesajLogin="Date logare incorecte sau nu a fost confirmat mailul!";
                obparam.res.redirect("/despre");
            }
        })
    });
});



app.post("/profil", function(req, res){
    console.log("profil");
    if (!req.session.utilizator){ //daca nu e logat
        afiseazaEroare(res,403,)
        res.render("pagini/eroare_generala",{text:"Nu sunteti logat."});
        return;
    }
    var formular= new formidable.IncomingForm(); //primesc datele din formular , in campuri text
 
    formular.parse(req,function(err, campuriText, campuriFile){
       
        var parolaCriptata=Utilizator.criptareParola(campuriText.parola);
        // AccesBD.getInstanta().update(
        //     {tabel:"utilizatori",
        //     campuri:["nume","prenume","email","culoare_chat"],
        //     valori:[`${campuriText.nume}`,`${campuriText.prenume}`,`${campuriText.email}`,`${campuriText.culoare_chat}`],
        //     conditiiAnd:[`parola='${parolaCriptata}'`]
        // },  
        AccesBD.getInstanta().updateParametrizat(//seamana cu update simplu
            {tabel:"utilizatori",
            campuri:["nume","prenume","email","culoare_chat"], //campuri pe care le updatez
            valori:[`${campuriText.nume}`,`${campuriText.prenume}`,`${campuriText.email}`,`${campuriText.culoare_chat}`], //valori respective din bd
            conditiiAnd:[`parola='${parolaCriptata}'`, `username='${campuriText.username}'`]//atat parola +user!
        },          
        function(err, rez){ //functia callback dupa realizarea querryului
            if(err){ //daca eroare bd
                console.log(err);
                afiseazaEroare(res,2);
                return;
            }
            console.log(rez.rowCount); //daca nu actualizez nici un rand,avertizare trimis prin locals
            if (rez.rowCount==0){
                res.render("pagini/profil",{mesaj:"Update-ul nu s-a realizat. Verificati parola introdusa."});
                return;
            }
            else{            
                //actualizare sesiune
                console.log("ceva");
                req.session.utilizator.nume= campuriText.nume;
                req.session.utilizator.prenume= campuriText.prenume;
                req.session.utilizator.email= campuriText.email;
                req.session.utilizator.culoare_chat= campuriText.culoare_chat;
                res.locals.utilizator=req.session.utilizator;
            }
 
 
            res.render("pagini/profil",{mesaj:"Update-ul s-a realizat cu succes."});
 
        });
       
 
    });
});

app.get("/useri", function(req, res){
   
    if(req?.utilizator?.areDreptul?.(Drepturi.vizualizareUtilizatori)){
        AccesBD.getInstanta().select({tabel:"utilizatori", campuri:["*"]}, function(err, rezQuery){
            console.log(err);
            res.render("pagini/useri", {useri: rezQuery.rows});
        });
    }
    else{
        afisareEroare(res, 403);
    }
});


app.post("/sterge_utiliz", function(req, res){
    if(req?.utilizator?.areDreptul?.(Drepturi.stergereUtilizatori)){
        var formular= new formidable.IncomingForm();
 
        formular.parse(req,function(err, campuriText, campuriFile){
           
                AccesBD.getInstanta().delete({tabel:"utilizatori", conditiiAnd:[`id=${campuriText.id_utiliz}`]}, function(err, rezQuery){
                console.log(err);
                res.redirect("/useri");
            });
        });
    }else{
        afisareEroare(res,403);
    }
})



app.get("/favicon.ico", function (req, res) {
    res.sendFile(__dirname + "/resurse/ico/favicon.ico");
});


app.get("/ceva", function (req, res) {
    console.log("cale:", req.url)
    res.send("<h1>altceva</h1> ip:" + req.ip);
})

 

app.get(["/despre", "/", "/homee","/login"], function (req, res) {
    let sir=req.session.mesajLogin;
    req.session.mesajLogin=null;
    res.render("pagini/despre", { ip: req.ip, a: 10, b: 20, imagini: obGlobal.obImagini.imagini,  mesajLogin:sir});
}) 
app.get("/*.ejs", function (req, res) {

    afiseazaEroare(res, 400);
});

app.get("/galerie", function (req, res) {
    let nrImagini = randomInt(5, 11);
    if (nrImagini % 2 == 0) nrImagini++;

    let imgInv = [...obGlobal.obImagini.imagini].reverse();

    let fisScss = path.join(__dirname, "resurse/scss/galerie_animata.scss");
    let liniiFisScss = fs.readFileSync(fisScss).toString().split("\n");

    let stringImg = "$nrImg: " + nrImagini + ";";

    liniiFisScss = liniiFisScss.slice(1);


    liniiFisScss.unshift(stringImg);


    fs.writeFileSync(fisScss, liniiFisScss.join("\n"));

    res.render("pagini/galerie", {
        imagini: obGlobal.obImagini.imagini,
        nrImagini: nrImagini,
        imgInv: imgInv
    });
});





app.get("/*", function (req, res) {
    try {
        console.log(req.url);
        res.render("pagini" + req.url, function (err, rezRandare) {
            if (err) {
                if (err.message.startsWith("Failed to lookup view"))
                    afiseazaEroare(res, 404); 
                else
                    afiseazaEroare(res);
            }
            else {
                console.log(rezRandare);
                res.send(rezRandare);
            }
        });
    } catch (err) {
        if (err.message.startsWith("Cannot find module"))
            afiseazaEroare(res, 404, "Fisier resursa negasit");
    }
}); 

function initErori() {
    var continut = fs.readFileSync(__dirname + "/resurse/json/erori.json").toString("utf-8"); 
    obGlobal.obErori = JSON.parse(continut);
    let vErori = obGlobal.obErori.info_erori;
    for (let eroare of vErori) { 
        eroare.imagine = "/" + obGlobal.obErori.cale_baza + "/" + eroare.imagine;
    }
}

initErori();

function initImagini() {
    var continut = fs
        .readFileSync(path.join(__dirname, "/resurse/json/galerie.json"))
        .toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut);

    let vImagini = obGlobal.obImagini.imagini;

    let caleAbs = path.join(__dirname, obGlobal.obImagini.cale_galerie);
    let caleAbsMediu = path.join(caleAbs, "mediu");
    let caleAbsMic = path.join(caleAbs, "mic");

    if (!fs.existsSync(caleAbsMediu)) {
        fs.mkdirSync(caleAbsMediu);
    }

    if (!fs.existsSync(caleAbsMic)) {
        fs.mkdirSync(caleAbsMic);
    }

    for (let imag of vImagini) {
        [nume_fisier, extensie] = imag.fisier.split(".");

        imag.fisier_mediu =
            "/" +
            path.join(
                obGlobal.obImagini.cale_galerie,
                "mediu",
                nume_fisier + "_mediu" + ".webp"
            );
        imag.fisier_mic =
            "/" +
            path.join(
                obGlobal.obImagini.cale_galerie,
                "mic",
                nume_fisier + "_mic" + ".webp"
            );

        let caleAbsFisMediu = path.join(__dirname, imag.fisier_mediu);
        let caleAbsFisMic = path.join(__dirname, imag.fisier_mic);

        sharp(path.join(caleAbs, imag.fisier))
            .resize(1000, 1000)
            .toFile(caleAbsFisMediu);
        sharp(path.join(caleAbs, imag.fisier))
            .resize(300, 300)
            .toFile(caleAbsFisMic);

        imag.fisier =
            "/" + path.join(obGlobal.obImagini.cale_galerie, imag.fisier);
    }
}
initImagini();








function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisierExt = path.basename(caleScss);
        let numeFis = numeFisierExt.split(".")[0];
        caleCss = numeFis + ".css";
        
    }
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }

    if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }
    let caleResBackup = path.join(obGlobal.folderBackup);
    if (!fs.existsSync(caleResBackup)) {
        fs.mkdirSync(caleResBackup, { recursive: true });
    }
    let numeFisCss = path.basename(caleCss);
    let data_curenta = new Date();
    let numeBackup =
        numeFisCss.split(".")[0] +
        "_" +
        data_curenta.toDateString().replace(" ", "_") +
        "_" +
        data_curenta.getHours() +
        "_" +
        data_curenta.getMinutes() +
        "_" +
        data_curenta.getSeconds() +
        ".css";


    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup,"resurse/css",numeBackup));
    }

    rez = sass.compile(caleScss, { sourceMap: true });

    fs.writeFileSync(caleCss, rez.css);

}

for (let numeFis of vFisiere) {
    if (path.extname(numeFis) === ".scss") {
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, function (event, filename) {
    console.log(event, filename);
    if (event === "change" || event === "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, filename);
        if (fs.existsSync(caleCompleta)) {
            compileazaScss(caleCompleta);
        }
    }
});







function afiseazaEroare(
        res,
        _identificator,
        _titlu = "titlu default",
        _text = "text default",
        _imagine
    ) {
        let vErori = obGlobal.obErori.info_erori;
        let eroare = vErori.find(function (element) {
            return element.identificator === _identificator;
        });
    
        if (eroare) {
            let titlu = (_titlu = "titlu default"
                ? eroare.titlu || _titlu
                : _titlu);
            let text = (_text = "text default" ? eroare.text || _text : _text);
            let imagine = (_imagine = "imagine default"
                ? eroare.imagine || _imagine
                : _imagine);
            if (eroare.status) {
                res.status(eroare.identificator).render("pagini/eroare.ejs", {
                    titlu: titlu,
                    text: text,
                    imagine: imagine,
                    optiuni: obGlobal.optiuniMeniu
                });
            } else {
                res.render("pagini/eroare.ejs", {
                    titlu: titlu,
                    text: text,
                    imagine: imagine
                });
            }
        } else {
            let errDef = obGlobal.obErori.eroare_default;
            res.render("pagini/eroare.ejs", {
                titlu: errDef.titlu,
                text: errDef.text,
                imagine: obGlobal.obErori.cale_baza + "/" + errDef.imagine
            });
        }
    }




app.listen(8080);
console.log("Serverul a pornit");