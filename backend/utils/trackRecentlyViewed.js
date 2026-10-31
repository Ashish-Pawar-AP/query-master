import { User } from "../modules/users/user.model.js";

const MAX_RECENTLY_VIEWED = 20;

// Moves a sub module to the front of the user's recently-viewed list, capped at
// MAX_RECENTLY_VIEWED. Two cheap single-document updates (pull, then push+slice) —
// no new documents created, so viewing queries never grows storage unbounded.
export async function trackRecentlyViewed(userId, subModuleId) {
  await User.updateOne({ _id: userId }, { $pull: { recentlyViewed: subModuleId } });
  await User.updateOne(
    { _id: userId },
    { $push: { recentlyViewed: { $each: [subModuleId], $position: 0, $slice: MAX_RECENTLY_VIEWED } } }
  );
}
