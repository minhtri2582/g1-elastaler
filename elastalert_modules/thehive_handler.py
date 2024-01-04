from elastalert.enhancements import BaseEnhancement

# For easier access to nested values in an array , this merges all items in array
# within  
class WindowSplitHashes(BaseEnhancement):
    # The enhancement is run against every match
    # The match is passed to the process function where it can be modified in any way
    # ElastAlert will do this for each enhancement linked to a rule
    def process(self, match):
        hashes = match["winlog"]["event_data"]["Hashes"]
        pairs = hashes.split(",")
        for pair in pairs:
            key, value = pair.split("=")
            if key.lower() == "md5":
                match["md5"] = value
            if key.lower() == "sha1":
                match["sha1"] = value
            if key.lower() == "sha256":
                match["sha256"] = value
