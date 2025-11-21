// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("test");

// Delete all podcasts except the one with ID: 6903ccd6aa91b4f8b496ac5b
const keepPodcastId = ObjectId("6903ccd6aa91b4f8b496ac5b");

// First, let's see how many podcasts will be deleted
const totalPodcasts = db.getCollection("podcasts").countDocuments({});
const keepPodcast = db.getCollection("podcasts").findOne({ _id: keepPodcastId });

print(`Total podcasts in database: ${totalPodcasts}`);

if (!keepPodcast) {
  print("WARNING: Podcast with ID 6903ccd6aa91b4f8b496ac5b not found!");
  print("No deletion will be performed to avoid data loss.");
} else {
  print(`Keeping podcast: "${keepPodcast.title}" (ID: ${keepPodcastId})`);
  
  // Delete all podcasts except the one we want to keep
  const result = db.getCollection("podcasts").deleteMany({
    _id: { $ne: keepPodcastId }
  });
  
  print(`Deleted ${result.deletedCount} podcasts`);
  print(`Remaining podcasts: ${totalPodcasts - result.deletedCount}`);
}
