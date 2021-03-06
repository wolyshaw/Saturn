const express = require('express')
const sequelize = require('../models')
const router = express.Router()
const {
  limitBody,
  bulkList,
  checkLogin,
} =  require('../utils')
const articles = require('../models/articles')
const users = require('../models/users')
const tags = require('../models/tags')
const article_tag = require('../models/article_tag')
const articlesUsers = articles.belongsTo(users, {foreignKey: 'author_id', as: 'author'})

articles.belongsToMany(tags, { through: article_tag, foreignKey: 'article_id' })
tags.belongsToMany(articles, { through: article_tag, foreignKey: 'tag_id' })

router.use('/list', async (req, res) => {
  return limitBody(req.body, ['author_id'])
    .then(where => {
      where.status = 21
      return articles.findAndCountAll({  where, include: [ articlesUsers, tags ] })
    })
    .then(r => r ? res.sendSuccess({data: r}) : res.sendError({msg: '暂无数据!'}))
    .catch(error => res.sendError(error))
})

router.use('/view', async (req, res) => {
  return limitBody(req.body, [['id', 'alias']])
    .then(where => {
      where.status = 21
      return articles.findOne({  where, include: [ articlesUsers, tags ] })
    })
    .then(r => r ? res.sendSuccess({data: r}) : res.sendError({msg: '暂无数据!'}))
    .catch(error => res.sendError(error))
})

router.use(checkLogin)

router.use('/create', async (req, res) => {
  sequelize.transaction().then(t => {
    return limitBody(
      req.body,
      [{key: 'title', required: true}, {key: 'alias', required: true}, 'excerpt', 'content', 'relate', 'pic']
    )
      .then(body => {
        body.author_id = req.user.id
        return articles.create({...body}, {transaction: t})
      })
    .then(async r => {
      t.commit()
      console.log(article_tag.findAll(r.id))
      const tags = await article_tag.bulkCreate(bulkList(r.id, req.body.tags), {transaction: t})
      return tags ? r : Error('新增tag出错')
    })
    .then(r => {
      res.sendSuccess({msg: '创建成功', data: r})
      t.commit()
    })
    .catch(error => {
      t.rollback()
      return res.sendError(error)
    })
  })
})
// router.use('/destroy', destroy)
// router.use('/edit', edit)

exports.router = router
