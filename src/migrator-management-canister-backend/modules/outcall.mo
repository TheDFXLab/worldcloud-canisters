import Types "../types";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import IC "ic:aaaaa-aa";

module {
  // public type TransformationInput = {
  //   context : Blob;
  //   response : IC.http_request_result;
  // };

  // public type TransformationOutput = IC.http_request_result;
  // public type Transform = query TransformationInput -> async TransformationOutput;

  //   public class Outcall(management_canister : Text) {
  public func transform(input : Types.TransformationInput) : Types.TransformationOutput {
    let response = input.response;
    {
      response with headers = [];
    };
  };

  public func make_http_request(method : Types.HttpMethodArgs, url : Text, request_headers : [IC.http_header], transform : Types.Transform) : async Types.Response<Types.HttpResponse> {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

    // Prepare HTTP req
    let http_request : IC.http_request_args = {
      url = url;
      max_response_bytes = null;
      headers = request_headers;
      body = null;
      method = method;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      is_replicated = ?false;
    };

    let http_response : IC.http_request_result = await (with cycles = 231_000_000_000) IC.http_request(http_request);

    // Check if the HTTP request was successful
    if (http_response.status != 200) {
      return #err("HTTP request failed with status: " # Nat.toText(http_response.status));
    };

    // Check if we have a response body
    if (http_response.body.size() == 0) {
      return #err("Empty response body received");
    };

    let decoded_text : Text = switch (Text.decodeUtf8(http_response.body)) {
      case (null) { return #err("Failed to decode response body as UTF-8") };
      case (?y) {
        if (Text.size(y) == 0) {
          return #err("Empty decoded text");
        };
        y;
      };
    };

    return #ok({ response = http_response; body = decoded_text });
  };

  // private func make_http_post_request(url : Text, extraHeaders : [Types.HttpHeader], body : Text) : async Text {
  //   let headers = Array.append(
  //     extraHeaders,
  //     [
  //       { name = "User-Agent"; value = "caffeine.ai" },
  //       { name = "Idempotency-Key"; value = "Time-" # Int.toText(Time.now()) },
  //     ],
  //   );
  //   let requestBody = Text.encodeUtf8(body);

  //   let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

  //   let httpRequest : Types.HttpRequestArgs = {
  //     url = url;
  //     max_response_bytes = null;
  //     headers;
  //     body = ?requestBody;
  //     method = #post;
  //     transform = ?{
  //       function = transform;
  //       context = Blob.fromArray([]);
  //     };
  //     is_replicated = ?false;
  //   };
  //   let httpResponse = await (with cycles = 230_949_972_000) IC.http_request(httpRequest);
  //   switch (Text.decodeUtf8(httpResponse.body)) {
  //     case (null) { Debug.trap("empty HTTP response") };
  //     case (?decodedResponse) { decodedResponse };
  //   };
  // };
};
// };
