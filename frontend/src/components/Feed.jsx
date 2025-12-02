import Posts from "./Posts";

const Feed = () => {
  return (
    <div className="flex-1 my-4 lg:my-8 flex flex-col items-center lg:pl-[20%] px-4 lg:px-0">
      <Posts />
    </div>
  );
};

export default Feed;
