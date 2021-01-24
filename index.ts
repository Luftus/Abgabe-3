import * as Http from "http";

import * as Mongo from "mongodb";
                            // beide Imports von der Vorlesung
const DB_NAME = 'luft'; //Name der Mongo DB Atlas 

let mongoClient: Mongo.MongoClient | null = null; //null=null initialisierung einer leeren variable die dann aufgefüllt wird
let users: Mongo.Collection | null = null;

export namespace A08Server {
    console.log("Starting server"); 


    let port: number = Number(process.env.PORT); //Wenn der Port nicht gegeben/gefunden ist wird der 8100 genommen 
    if (!port)
        port = 8100;
                      
    mongoDbConnect();// aufrufen der mongodbconnect function 
    // Codeschnipsel aus Lektion 3.2 der Node-Server-Beispielcode unter der Abteilung "URL Modul" ausgabe von den requests und was eingeht
    let server: Http.Server = Http.createServer();
    server.addListener("request", handleRequest);
    server.addListener("listening", handleListen); 
    server.listen(port);
                                                        
    async function mongoDbConnect(): Promise<void>{ //verbindung mit dem mongo atlas aufbauen/ warten bis man connected, promise vor void wegen dem async weil die funktion ja schauen muss ob wir connecten
        const uri: string = "mongodb+srv://GISWISE2021:GISWISE2021@cluster0.qcexn.mongodb.net/"+DB_NAME+"?retryWrites=true&w=majority";
        mongoClient = new Mongo.MongoClient(uri, { useNewUrlParser: true }); // Zeilen 26 und 27 aus der Cluster Connection Method entnommen aus Atlas
        await mongoClient.connect(); //verbindung mit mongo 
        users = mongoClient.db(DB_NAME).collection("users"); //Aufrufen der mongo collection "luft.users"
    }
                        
    function handleListen(): void { //Wenn was reinkommt, kommt auf dem terminal listening 
        console.log("Listening");
    }
         //Soll sich alle  Informationen rausholen die beim registrieren eingegeben werden 
    async function register(request: URLSearchParams): Promise<string>{
        let vorname: string | null = request.get('vorname');
        let nachname: string | null = request.get('nachname');
        let psw: string | null = request.get('psw');
        let email: string | null = request.get('email');
        //Schaut nach ob die eingegebenen Daten überhaupt korrekt sind
        if (!vorname || !nachname || !psw || !email || !users) {
            return "error";
        }
        //Soll nachschauen ob der user überhaupt existiert, Zeile 47 soll schauen ob überhaupt was reingegangen ist 
        let userArray = await users.find({email: email}).toArray();
        if (userArray && userArray.length > 0) {
            return "already_existing";
        }

        //Erstellt Dokumentation von den ganzen daten 
        await users.insertOne({vorname: vorname, nachname: nachname, password: psw, email: email});

        return "success: user_created";
    }
    // Funktion der Login seite, also ob email und passwort übereinstimmen
    async function login(request: URLSearchParams): Promise<string> {
        let psw = request.get('psw');
        let email = request.get('email');
        if(!psw || !email || !users){
            return "error";   //passwort+email Kombi nicht vorhanden 
        }
        let userArray = await users.find({email: email, password: psw}).toArray();
        if(userArray && userArray.length > 0){
            return "success"; //Kombination ist vorhanden+ es ist überhaupt was angekommen
        }
        return "not_existing";//es gab probleme bei der datenbank und nichts kam rein
        
    }
   // Funktion für die ausgaben der vor und nachnamen 
    async function getUserlist() : Promise<string> {
        if(!users){
            return ""; //also wenn keiner user gefunden wurde bzw nichts ankam wird nichts ausgegeben
        }
         //erstellt einen String array von den vor und nachnamen/ sucht diese 
        let userArray: any[] = await users.find({}).toArray();
        let names:string[] = []; //leeren Array anlegen 
        userArray.forEach((entry) =>{ //Aufbau des arrays gliedern bzw der Einträge
           names.push(entry.vorname + " " + entry.nachname); 
        });
        return names.join('<br/>');//["eric", "luft"] -> join -> eric <br/> luft <br/> 
    }
       // Diese Funktion soll nach dem HTTP prinzip je nach url erstellt er eine Seite welche dann die Datensätze überträgt 
    async function evaluateResponse(url: string, request: Http.IncomingMessage) {
        console.log(url);
        let response = '';
        if(url.startsWith('/register')){//Das register am anfang wo man seine 4 daten eingibt 
            let data = new URLSearchParams(url.replace('/register', '')); //   ?name=Eric&nachname=Luft..etc 
            response = await register(data);
        }
        if(url.startsWith('/login')){
            let data = new URLSearchParams(url.replace('/login', '')); //email+passwort abfrage 
            response = await login(data);
        }
        if(url.startsWith('/userlist')){ //ausgabe der ganzen vor und nachnamen
            response = await getUserlist();
        }

        return response;
    }
      // Codeschnipsel aus Lektion 3.2 der Node-Server-Beispielcode unter der Abteilung "URL Modul" von lukas
    async function handleRequest(_request: Http.IncomingMessage, _response: Http.ServerResponse): Promise<void> {
        console.log("I hear voices!", _request.url);

        let response = await evaluateResponse(<string>_request.url, _request);

        _response.setHeader("content-type", "text/html; charset=utf-8");
        _response.setHeader("Access-Control-Allow-Origin", "*");

        _response.write(response);

        _response.end();
    }
}
