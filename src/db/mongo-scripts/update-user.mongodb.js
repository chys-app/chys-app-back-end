// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("test");

// Delete all users created yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);
const today = new Date();
today.setHours(0, 0, 0, 0);

const result = db.getCollection("users").deleteMany({
  createdAt: {
    $gte: yesterday,
    $lt: today
  }
});

print(`Deleted ${result.deletedCount} users created yesterday`);
