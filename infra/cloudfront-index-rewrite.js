// CloudFront Function (viewer request) — maps directory-style URLs onto the
// files a Next.js static export actually writes.
//
// The frontend builds with `trailingSlash: true`, so routes land on disk as
// `about/index.html`. An S3 origin behind OAC is a REST origin: it serves exact
// keys only and, unlike S3's website-hosting endpoint, will not resolve a
// directory to its index document. Without this, every route except `/` returns
// AccessDenied/NoSuchKey.
//
// Written against the ES5.1 CloudFront Functions runtime — no endsWith/includes.

function handler(event) {
    var request = event.request;
    var uri = request.uri;

    if (uri.charAt(uri.length - 1) === '/') {
        request.uri = uri + 'index.html';
        return request;
    }

    // Only treat a dot in the LAST segment as a file extension, so a path like
    // /v1.2/about is still routed as a directory.
    var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
    if (lastSegment.indexOf('.') === -1) {
        request.uri = uri + '/index.html';
    }

    return request;
}
