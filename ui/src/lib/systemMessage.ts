export const formatSystemText = (text: string, currentUserName?: string) => {
  if (!currentUserName) return text;

  const createdMatch = text.match(/^(.+?) created group "(.+)"$/);
  if (createdMatch) {
    const [, actor, groupName] = createdMatch;
    if (actor === currentUserName) return `You created group "${groupName}"`;
    return text;
  }

  const addedMatch = text.match(/^(.+?) added (.+)$/);
  if (addedMatch) {
    const [, actor, target] = addedMatch;
    if (target === currentUserName) return `${actor} added you`;
    if (actor === currentUserName) return `You added ${target}`;
    return text;
  }

  const removedMatch = text.match(/^(.+?) removed (.+)$/);
  if (removedMatch) {
    const [, actor, target] = removedMatch;
    if (target === currentUserName) return `${actor} removed you`;
    if (actor === currentUserName) return `You removed ${target}`;
    return text;
  }

  const leftMatch = text.match(/^(.+?) left$/);
  if (leftMatch) {
    const [, actor] = leftMatch;
    if (actor === currentUserName) return "You left";
    return text;
  }

  return text;
};

