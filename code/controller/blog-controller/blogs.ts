import express from "express";
import { merge } from "lodash";

import { createBlog } from "../../api/blog-api/services";
import { getUserBySessionToken } from "../../api/user-api/getUserBySessionToken";
import { getAllBlogs } from "../../api/blog-api/services/getAllBlogs";
import { deleteBlogById } from "../../api/blog-api/services/deleteBlogById";
import { getBlogByCategory } from "../../api/blog-api/services/getBlogByCategory";
import { getBlogByHashTag } from "../../api/blog-api/services/getBlogByHashTag";
import { getBlogById } from "../../api/blog-api/services/getBlogById";
import { updateUserById } from "../../api/user-api/updateUserById";
import { getUserById } from "../../api/user-api/getUserById";
import { newBlogTrend } from "../../api/trending-api/newBlogTrend";
import { getBlogTrendById } from "../../api/trending-api/getBlogTrendById";

export const createNewBlog = async (
  req: express.Request,
  res: express.Response
) => {
  const { title, content, category, hashTag } = req.body;

  if (!title || !content) {
    console.log("Need Title and Content to create a blog");
    return res.sendStatus(400);
  }
  try {
    const sessionToken = req.cookies[process.env.CRYPTO_SECRET];

    if (!sessionToken) {
      return res.sendStatus(403);
    }

    const existingUser = await getUserBySessionToken(sessionToken);
    if (!existingUser) {
      return res.sendStatus(403);
    }

    const username = existingUser.username;
    const userId = existingUser.id;

    const now = new Date();
    const date = now.toISOString();
    const viewCount = 0;
    const recentAccess = [""];

    const newBlog = await createBlog({
      title,
      content,
      username,
      userId,
      date,
      category,
      hashTag,
      viewCount,
      recentAccess,
    });

    // get user blog histroy
    const userBlogHistory = existingUser.blogHistory.blogids || [];

    userBlogHistory.push(`${newBlog._id}`);

    await updateUserById(existingUser.id, {
      blogHistory: { blogids: userBlogHistory },
    });

    // This function is commented out :: only addes in one blog log and overwrites.
    // await updateUserById(
    //   existingUser.id,
    //   merge(existingUser.blogHistory, {
    //     blogHistory: { blogids: `${newBlog._id}` },
    //   })
    // );

    return res.status(200).json(newBlog).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// This function will be used to show the list of blogs.
// To-Do: make it return in DESC order in time so it shows most recent ones first.
export const getBlog = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const blogs = await getAllBlogs();
    const now = new Date();
    const date = now.toISOString();

    // This block was used to initialise viewCount property on blogs created before viewCount
    for (let i = 0; i < blogs.length; i++) {
      if (!blogs[i].viewCount) {
        blogs[i].viewCount = 0;
        blogs[i].save();
      }
      // This block was used to initialise recentAccess
      if (!blogs[i].recentAccess) {
        blogs[i].recentAccess = [""];
      }
      // gives the lastTrendingTime value of 1970-01-01 and this only refers that there has not been a trending in this blog.
      // if (!blogs[i].lastTrendingTime) {
      //   blogs[i].lastTrendingTime = new Date(0);
      // }
    }

    return res.status(200).json(blogs);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getPopularBlog = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const blogs = await getAllBlogs();
    // Select Top 5 blogs
    const popularBlogs = blogs.sort(
      (a, b) => a.viewCount - b.viewCount
    );
    // Saves top 5 blogs in lower view to highest view order.
    const topFiveBlogs = popularBlogs.slice(-5);
    return res.status(200).json(topFiveBlogs);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// This controller function will be used to load up the blog when clicked on individually from the list of blogs.
// Therefore it will also add +1 view to the blog.
export const get_BlogById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const blogs = await getBlogById(id);

    // checks if there is a viewCount property, if not initialise it.
    if (blogs.viewCount) {
      blogs.viewCount += 1;
    } else {
      blogs.viewCount = 1;
    }

    // >> isTrending Part
    // add new time to recentAccess
    const now = new Date();
    const date = now.toISOString();
    if (blogs.recentAccess && blogs.recentAccess.length < 10) {
      blogs.recentAccess.push(`${date}`);
    }
    // removes 'first in' - oldest time entry by shift()
    if (blogs.recentAccess && blogs.recentAccess.length === 10) {
      blogs.recentAccess.shift();
      blogs.recentAccess.push(`${date}`);
    }
    if (!blogs.recentAccess) {
      blogs.recentAccess = [`${date}`];
    }

    // gets how far the latest access of the blog is to the oldest in the array
    const latestAccess = new Date(blogs.recentAccess[9]);
    const oldestAccess = new Date(blogs.recentAccess[0]);

    const hourDifference =
      (latestAccess.getTime() - oldestAccess.getTime()) /
      (1000 * 60 * 60);

    if (hourDifference < 24) {
      // console.log(hourDifference);
      // console.log("This blog is fire");
      blogs.lastTrendingTime = now;
      const author = await getUserById(blogs.userId);
      if (!author.popularBlogsWritten.blogids.includes(id)) {
        author.popularBlogsWritten.blogids.push(id);
        author.save();
      }
      try {
        const blogTrend = await getBlogTrendById(id);
        // check if the blog is already recorded, or if the search returns an empty array.
        if (!blogTrend || blogTrend.length === 0) {
          await newBlogTrend({ blogId: id, time: now });
        } else {
          //check if the last trend date was more than 1 week ago.
          const now = new Date().getTime();
          // console.log("Blog Trend", blogTrend[0].time);
          const lastTrendedingTime = new Date(
            blogTrend[0].time
          ).getTime();
          const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days x 24 hours x 60 minutes x 60 seconds x 1000 milliseconds
          const timeDifference = Math.abs(now - lastTrendedingTime);

          if (timeDifference >= oneWeek) {
            console.log("Second Wind! Blog back on Trending!");
            blogTrend[0].time = new Date();
            if (blogTrend[0].repeat) {
              blogTrend[0].repeat += 1;
            } else {
              blogTrend[0].repeat = 1;
            }
          } else {
            console.log("The dates are less than one week apart");
          }
        }
      } catch (error) {
        console.log(error);
        // don't halt the service.
      }
    }

    // >> isTrending Part done

    blogs.save();
    return res.status(200).json(blogs);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const deleteBlog = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const deletedBlog = await deleteBlogById(id);
    return res.json(deletedBlog);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getAllBlogByCategory = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const category = req.query.category as string;
    if (!category) {
      return res
        .status(400)
        .send("Category is required to be entered to search blog.");
    }
    const findBlog = await getBlogByCategory(category);
    return res.json(findBlog);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const updateBlog = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const input = req.body;
    console.log(input);
    const blog = await getBlogById(id);
    console.log(blog);
    if (!input) {
      console.log("No input");
      res.sendStatus(400);
    }

    merge(blog, input);
    await blog.save();

    return res.status(200).json(blog).end();
  } catch (error) {
    return res.sendStatus(400);
  }
};

export const getAllBlogByHashTag = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // const { hashTag } = req.params;
    const hashTag = req.query.hashTag as string;
    // console.log("query HT", hashTag);
    if (!hashTag) {
      return res
        .status(400)
        .send("Hash tag is required to be entered to search blog.");
    }
    const findBlog = await getBlogByHashTag(hashTag);

    return res.status(200).json(findBlog);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// new route /favorite
export const addFavoriteBlog = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // on blog, click a button and run the route

    // gets the blog id from current blog, assume it is passed as param
    const { id } = req.params;

    const sessionToken = req.cookies[process.env.CRYPTO_SECRET];

    if (!sessionToken) {
      return res.sendStatus(403);
    }

    const currentUser = await getUserBySessionToken(sessionToken);
    if (!currentUser) {
      return res.sendStatus(403);
    }

    if (!currentUser.favortieBlog.blogids.includes(id)) {
      currentUser.favortieBlog.blogids.push(id);
    }
    currentUser.save();

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};
