import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import StoryItem from './StoryItem';
import CreateStory from './CreateStory';
import StoryViewer from './StoryViewer';

const StoryBar = () => {
  const { stories } = useSelector((store) => store.story);
  const { user } = useSelector((store) => store.auth);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);

  // My stories group if it exists
  const myStories = stories.find(group => group.author._id.toString() === user?._id?.toString());
  const otherStories = stories.filter(group => group.author._id.toString() !== user?._id?.toString());

  return (
    <div className="flex items-center gap-4 py-4 px-2 overflow-x-auto no-scrollbar bg-transparent border-b border-gray-300">
      {/* My Story / Add Story */}
      <StoryItem 
        author={user} 
        isCurrentUser={true}
        hasUnseenStories={myStories?.stories.length > 0}
        onClick={() => myStories ? setSelectedStoryIndex(stories.indexOf(myStories)) : setShowCreateStory(true)}
        onAddClick={(e) => {
          e.stopPropagation();
          setShowCreateStory(true);
        }}
      />

      {/* Others' Stories */}
      {otherStories.map((group, index) => (
        <StoryItem 
          key={group.author._id} 
          author={group.author} 
          hasUnseenStories={true} // For now assume unseen
          onClick={() => setSelectedStoryIndex(stories.indexOf(group))}
        />
      ))}

      {showCreateStory && (
        <CreateStory 
          open={showCreateStory} 
          onOpenChange={setShowCreateStory} 
        />
      )}

      {selectedStoryIndex !== null && (
        <StoryViewer 
          open={selectedStoryIndex !== null} 
          onOpenChange={() => setSelectedStoryIndex(null)}
          storyGroups={stories}
          initialGroupIndex={selectedStoryIndex}
        />
      )}
    </div>
  );
};

export default StoryBar;
