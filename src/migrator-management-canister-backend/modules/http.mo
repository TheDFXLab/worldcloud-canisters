import Types "../types";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Nat64 "mo:base/Nat64";
import Debug "mo:base/Debug";

module {
    let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production

    // // //function to transform the response
    // // public shared func transform({
    // //     context : Blob;
    // //     response : Types.HttpRequestResult;
    // // }) : async Types.HttpRequestResult {
    // //     {
    // //         response with headers = []; // not intersted in the headers
    // //     };
    // // };

    // //PULIC METHOD
    // //This method sends a POST request to a URL with a free API we can test.
    // public func send_http_post_request(url : Text, stringified_body : Text) : async Text {
    //     let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    //     //1. SETUP ARGUMENTS FOR HTTP GET request

    //     // 1.1 Setup the URL and its query parameters
    //     //This URL is used because it allows us to inspect the HTTP request sent from the canister
    //     // let host : Text = "putsreq.com";
    //     // let url = "https://putsreq.com/aL1QS5IbaQd4NTqN3a81"; //HTTP that accepts IPV6

    //     // 1.2 prepare headers for the system http_request call

    //     //idempotency keys should be unique so we create a function that generates them.
    //     let idempotency_key : Text = generateUUID();
    //     Debug.print("Created idempotency key: " # idempotency_key);
    //     let request_headers = [
    //         { name = "User-Agent"; value = "http_post_sample" },
    //         { name = "Content-Type"; value = "application/json" },
    //         { name = "Idempotency-Key"; value = idempotency_key },
    //     ];
    //     Debug.print("Request headers: " # debug_show (request_headers));

    //     // The request body is a Blob, so we do the following:
    //     // 1. Write a JSON string
    //     // 2. Convert Text into a Blob
    //     let request_body_json : Text = stringified_body;
    //     let request_body = Text.encodeUtf8(request_body_json);

    //     Debug.print("JSON Stringified body utf8: " # debug_show (request_body));

    //     // 1.3 The HTTP request
    //     let http_request : Types.HttpRequestArgs = {
    //         url = url;
    //         max_response_bytes = null; //optional for request
    //         headers = request_headers;
    //         //note: type of `body` is ?Blob so we pass it here as "?request_body" instead of "request_body"
    //         body = ?request_body;
    //         method = #post;
    //         transform = ?{
    //             function = transform;
    //             context = Blob.fromArray([]);
    //         };
    //     };

    //     //2. ADD CYCLES TO PAY FOR HTTP REQUEST

    //     //IC management canister will make the HTTP request so it needs cycles
    //     //See: https://internetcomputer.org/docs/current/motoko/main/cycles

    //     //The way Cycles.add() works is that it adds those cycles to the next asynchronous call
    //     //See:
    //     // - https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-http_request
    //     // - https://internetcomputer.org/docs/current/references/https-outcalls-how-it-works#pricing
    //     // - https://internetcomputer.org/docs/current/developer-docs/gas-cost
    //     ExperimentalCycles.add<system>(230_850_258_000);
    //     Debug.print("Added cyles...");

    //     Debug.print("Making request...");

    //     //3. MAKE HTTPS REQUEST AND WAIT FOR RESPONSE
    //     let http_response : Types.HttpRequestResult = await IC.http_request(http_request);
    //     Debug.print("Got encoded response: " # debug_show (http_response));
    //     //4. DECODE THE RESPONSE

    //     //As per the type declarations, the BODY in the HTTP response
    //     //comes back as Blob. Type signature:

    //     //public type http_request_result = {
    //     //     status : Nat;
    //     //     headers : [HttpHeader];
    //     //     body : Blob;
    //     // };

    //     //We need to decode that Blob that is the body into readable text.
    //     //To do this, we:
    //     //  1. Use Text.decodeUtf8() method to convert the Blob to a ?Text optional
    //     //  2. We use a switch to explicitly call out both cases of decoding the Blob into ?Text
    //     let decoded_text : Text = switch (Text.decodeUtf8(http_response.body)) {
    //         case (null) { "No value returned" };
    //         case (?y) { y };
    //     };

    //     Debug.print("Decoded response text:" # decoded_text);
    //     //5. RETURN RESPONSE OF THE BODY
    //     let result : Text = decoded_text # ". See more info of the request sent at: " # url # "/inspect";
    //     result;
    // };

    // public func send_http_get_request(url : Text) : async Text {
    //     let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

    //     //1. SETUP ARGUMENTS FOR HTTP GET request
    //     // let ONE_MINUTE : Nat64 = 60;
    //     // let start_timestamp : Nat64 = 1682978460; //May 1, 2023 22:01:00 GMT
    //     // let host : Text = "api.exchange.coinbase.com";
    //     // let url = "https://" # host # "/products/ICP-USD/candles?start=" # Nat64.toText(start_timestamp) # "&end=" # Nat64.toText(start_timestamp) # "&granularity=" # Nat64.toText(ONE_MINUTE);

    //     // 1.2 prepare headers for the system http_request call
    //     let request_headers = [
    //         { name = "User-Agent"; value = "price-feed" },
    //     ];

    //     // 1.3 The HTTP request
    //     let http_request : Types.HttpRequestArgs = {
    //         url = url;
    //         max_response_bytes = null; //optional for request
    //         headers = request_headers;
    //         body = null; //optional for request
    //         method = #get;
    //         transform = ?{
    //             function = transform;
    //             context = Blob.fromArray([]);
    //         };
    //     };

    //     //2. ADD CYCLES TO PAY FOR HTTP REQUEST

    //     //IC management canister will make the HTTP request so it needs cycles
    //     //See: https://internetcomputer.org/docs/current/motoko/main/cycles

    //     //The way Cycles.add() works is that it adds those cycles to the next asynchronous call
    //     //See:
    //     // - https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-http_request
    //     // - https://internetcomputer.org/docs/current/references/https-outcalls-how-it-works#pricing
    //     // - https://internetcomputer.org/docs/current/developer-docs/gas-cost
    //     ExperimentalCycles.add<system>(230_949_972_000);

    //     //3. MAKE HTTPS REQUEST AND WAIT FOR RESPONSE
    //     let http_response : Types.HttpRequestResult = await IC.http_request(http_request);

    //     //4. DECODE THE RESPONSE

    //     //As per the type declarations, the BODY in the HTTP response
    //     //comes back as Blob. Type signature:

    //     //public type http_request_result = {
    //     //     status : Nat;
    //     //     headers : [HttpHeader];
    //     //     body : Blob;
    //     // };

    //     //We need to decode that Blob that is the body into readable text.
    //     //To do this, we:
    //     //  1. Use Text.decodeUtf8() method to convert the Blob to a ?Text optional
    //     //  2. We use a switch to explicitly call out both cases of decoding the Blob into ?Text
    //     let decoded_text : Text = switch (Text.decodeUtf8(http_response.body)) {
    //         case (null) { "No value returned" };
    //         case (?y) { y };
    //     };

    //     //5. RETURN RESPONSE OF THE BODY
    //     //The API response will looks like this:
    //     //
    //     // ("[[1682978460,5.714,5.718,5.714,5.714,243.5678]]")
    //     //
    //     //The API response looks like this:
    //     //  [
    //     //     [
    //     //         1682978460, <-- start timestamp
    //     //         5.714, <-- lowest price during time range
    //     //         5.718, <-- highest price during range
    //     //         5.714, <-- price at open
    //     //         5.714, <-- price at close
    //     //         243.5678 <-- volume of ICP traded
    //     //     ],
    //     // ]
    //     decoded_text;
    // };

    // //PRIVATE HELPER FUNCTION
    // //Helper method that generates a Universally Unique Identifier
    // //this method is used for the Idempotency Key used in the request headers of the POST request.
    // //For the purposes of this exercise, it returns a constant, but in practice it should return unique identifiers
    // func generateUUID() : Text {
    //     "UUID-123456789";
    // };

};
