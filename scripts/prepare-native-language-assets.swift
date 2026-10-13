import Foundation
import NaturalLanguage

// Explicit CI/developer preparation only; never called by the application.
// The observed Apple optional Chinese asset bundle contains both sentiment and
// embedding data. Request its public tagger assets when missing, then require
// check-native-capabilities.mjs to verify sentence vectors in a fresh process.
// A successful tagger request alone does NOT establish sentence-model support.
if NLEmbedding.sentenceEmbedding(for: .simplifiedChinese) != nil {
    print("Chinese sentence model is already available; no asset request needed.")
    exit(0)
}

if NLTagger.availableTagSchemes(for: .paragraph, language: .simplifiedChinese).contains(.sentimentScore) {
    FileHandle.standardError.write(Data("Chinese sentiment assets are available but the sentence model is missing; cannot prepare it through this public API.\n".utf8))
    exit(1)
}

print("Requesting optional Chinese language assets through Apple's public NLTagger API.")
NLTagger.requestAssets(for: .simplifiedChinese, tagScheme: .sentimentScore) { result, error in
    if let error = error {
        FileHandle.standardError.write(Data("Chinese asset request failed: \(error.localizedDescription)\n".utf8))
        exit(1)
    }
    guard result == .available else {
        FileHandle.standardError.write(Data("Chinese assets are unavailable from the system provider.\n".utf8))
        exit(1)
    }
    print("Tagger assets are available; sentence vectors still require a fresh-process check.")
    exit(0)
}
DispatchQueue.global().asyncAfter(deadline: .now() + 240) {
    FileHandle.standardError.write(Data("Chinese language asset preparation timed out after 240 seconds.\n".utf8))
    exit(1)
}
dispatchMain()
