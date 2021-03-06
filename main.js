const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const {users} = require('./db/users');
let {posts} = require('./db/posts');
let {comments} = require('./db/comments');
const {guid} = require('./utils/guid');

const app = new Koa();
const router = new Router();
const defaulAuthor = {
    id: users[0].id,
    name: users[0].name
}
const common = (ctx, next) => {
    console.log('ctx.request.url: ', ctx.request.url);
    console.log('ctx.request.body: ', ctx.request.body);
    ctx.response.type = 'json';
    next();
}
// 登录验证模块
router.post('/user/login', (ctx, next) => {
    const body = ctx.request.body;
    // console.log(body);
    if (body.name) {
        const result = (users || []).filter(element => {
            return element.name == body.name && element.password == body.password;
        });
        // console.log(result);
        if (result.length > 0) {
            console.log('登录成功！');
            ctx.response.body = {code: 0, result: result[0]};
        } else {
            console.log('登录失败！');
            ctx.response.body = {code: 1, result: "username or password error"};
        }
    }
    next();
});

// post帖子模块
// 获取帖子列表
router.get('/post', (ctx, next) => {
    var allPosts = getAllPosts(posts);
    if (allPosts.length > 0) {
        console.log('获取帖子列表成功：', JSON.stringify(allPosts));
        ctx.response.body = {code: 0, result: allPosts};
    } else {
        console.log('获取帖子列表：', 'no posts yet');
        ctx.response.body = {code: 1, result: 'no posts yet'};
    }
    next();
})
// 获取单个帖子详情
router.get('/post/:postId', (ctx, next) => {
    const postId = ctx.params.postId;
    const post = findPostById(postId, posts);
    if (post) {
        console.log(`查询postId:${postId}对应的post为：${JSON.stringify(post)}`);
        ctx.response.body = {code: 0, result: post};
    } else {
        console.log(`查询postId:${postId}失败，未找到`);
        ctx.response.body = {code: 1, result: 'not found'};
    }
    next();
})
// 新增帖子
router.post('/post', (ctx, next) => {
    const body = ctx.request.body;
    const post = {
        id: guid(),
        userId: body.userId || defaulAuthor.id,
        title: body.title || '我是title',
        vote: 0,
        updatedAt: new Date().getTime(),
        content: body.content || '我要说什么？'
    };
    console.log(`新增的post为：${JSON.stringify(post)}`);
    posts.push(post);
    ctx.response.body = {code: 0, result: post};
    next();
})
// 修改帖子
router.put('/post/:postId', (ctx, next) => {
    const postId = ctx.params.postId;
    const post = findPostById(postId, posts);
    if (post) {
        const body = ctx.request.body;
        post.title = body.title || post.title;
        post.userId = body.userId || post.userId,
        post.updatedAt = new Date().getTime();
        post.vote = Number(body.vote) || post.vote,
        post.content = body.content || post.content;
        console.log(`修改的post为：${JSON.stringify(post)}`);
        ctx.response.body = {code: 0, result: post};
    } else {
        console.log(`查询postId:${postId}失败，未找到`);
        ctx.response.body = {code: 1, result: 'not found your post! postId= ' + postId};
    }
    next();
})
//删除帖子
router.del('/post/:postId', (ctx, next) => {
    const postId = ctx.params.postId;
    const post = findPostById(postId, posts);
    if (post) {
        posts = posts.filter(item => item.id !== postId);
        console.log(`删除的post为：${JSON.stringify(post)}`);
        console.log(`剩下的post为${JSON.stringify(posts)}`);
        ctx.response.body = {code: 0, result: post};
    } else {
        console.log(`查询postId:${postId}失败，未找到`);
        ctx.response.body = {code: 1, result: 'not found your post!'};
    }
    next();
})
// 查询评论列表
router.get('/comment/:postId', (ctx, next) => {
    const postId = ctx.params.postId;
    const results = findCommentsById(postId, comments);
    if (results.length > 0) {
        console.log(`查询postId:${postId}的comments：${JSON.stringify(results)}`);
        ctx.response.body = {code: 0, result: results};
    } else {
        ctx.response.body = {code: 1, result: 'no comments yet'};
    }
    next();
})
// 新增评论
router.post('/comment', (ctx, next) => {
    const body = ctx.request.body;
    const post = findPostById(body.postId, posts);
    if (!post) {
        console.log(`查询postId:${body.postId}失败，未找到`);
        ctx.response.body = {code: 0, result: `not found post! postId = ${body.postId}`};
        next();
        return;
    }
    const comment = {
        id: guid(),
        postId: post.id,
        userId: body.userId || defaulAuthor.id,
        updatedAt: new Date().getTime(),
        content: body.content
    }
    console.log(`新增的comment为：${JSON.stringify(comment)}`);
    comments.push(comment);
    ctx.response.body = {code: 0, result: findCommentsById(post.id, comments)};
    next();
})

// 错误处理
app.on('error', (err, ctx) => {
    console.error('server error:');
    console.error(err);
    ctx.response.status = err.statusCode || err.status || 500;
    ctx.response.body = err.message;
})
app.use(koaBody()).use(common).use(router.routes()).use(router.allowedMethods);

app.listen(4000);

function getAllPosts(posts) {
    return posts.map((post) => {
        const user = findAuthorById(post.userId);
        return {
            id: post.id,
            title: post.title,
            vote: post.vote,
            updatedAt: post.updatedAt,
            author: {id:user.id, name:user.name}
        }
    })
}
function findPostById(postId, posts) {
    const filterResults = posts.filter(item => item.id === postId);
    if (filterResults.length > 0) {
        const post = filterResults[0];
        const user = findAuthorById(post.userId);
        post.author = {id:user.id, name:user.name}
        return post;
    }
}
function findCommentsById(postId, comments) {
    const filterResults =  comments.filter(item => item.postId === postId);
    return filterResults.map(comment => {
        const user = findAuthorById(comment.userId);
        comment.author = {id:user.id, name:user.name}
        return comment;
    })
}
function findAuthorById(userId) {
    const resultArr =  users.filter(item => item.id === userId);
    if (resultArr.length > 0) {
        return resultArr[0];
    }
}