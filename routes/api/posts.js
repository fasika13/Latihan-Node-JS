const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

//@route     POST api/posts
//@desc      Create a post
//@acess     Private
router.post(
    '/', 
    [ 
        auth, 
        [
            check('text','Text is required')
                .not()
                .isEmpty()
        ]
    ],
    async (req, res) => {
        const error = validationResult(req);
        if(!error.isEmpty()) {
            return res.status(400).json({ errors: error.array() });
        }

        try {
            const user = await User.findById(req.user.id).select('-password');

            const newPost = new Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            });

            const post = await newPost.save();

            res.json(post);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

//@route     GET api/posts
//@desc      Get all post
//@acess     Private
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

//@route     GET api/posts/:id
//@desc      Get post by ID
//@acess     Private
router.get('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if(!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        res.json(post);
    } catch (err) {
        console.error(err.message);
        if(err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});

//@route     DELETE api/posts/:id
//@desc      Delete a post
//@acess     Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if(!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check user
        if(post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await post.remove();

        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err.message);
        if(err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});

//@route     PUT api/posts/like:id
//@desc      Like a post
//@acess     Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const post = await Post .findById(req.params.id);

        // Chceck if the post has alreadybeen liked
        if (post.likes.filter(like => like.user.toString() === req.user.id).leght > 0) {
            return res.json(400).json({ msg: 'Post already liked'});
        }

        post.likes.unshift({ user: req.user.id });

        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

//@route     PUT api/posts/unlike:id
//@desc      Like a post
//@acess     Private
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        const post = await Post .findById(req.params.id);

        // Chceck if the post has alreadybeen liked
        if (post.likes.filter(like => like.user.toString() === req.user.id).leght === 0)
        {
            return res.json(400).json({ msg: 'Post already liked'});
        }

        // Get remove index
        const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);

        post.likes.splice(removeIndex, 1);
        
        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

//@route     POST api/posts/comment/:id
//@desc      Create a post
//@acess     Private
router.post(
    '/comment/:id', 
    [ 
        auth, 
        [
            check('text','Text is required')
                .not()
                .isEmpty()
        ]
    ],
    async (req, res) => {
        const error = validationResult(req);
        if(!error.isEmpty()) {
            return res.status(400).json({ errors: error.array() });
        }

        try {
            const user = await User.findById(req.user.id).select('-password');
            const post = await Post.findById(req.params.id);

            const newComment = {
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            };

            post.comments.unshift(newComment);

            await post.save();

            res.json(post.comments);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

//@route     DELETE api/posts/comment/:id/comment_id
//@desc      Delete comment
//@acess     Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Pull out comment
        const comment = post.comments.find(
            comment => comment.id === req.params.comment_id
        );

        // Make sure comment exists
        if (!comment) {
            return res.status(404).json({ msg: 'Comment does not exists'});
        }

        // Check user
        if(comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized'});
        }

        // Get remove index
        const removeIndex = post.comments.map(like => comment.user.toString()).indexOf(req.user.id);

        post.comments.splice(removeIndex, 1);
        
        await post.save();

        res.json(post.comments);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }

});

module.exports = router;