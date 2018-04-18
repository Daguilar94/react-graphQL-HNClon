import React, { Component } from 'react';
import Link from './Link';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { LINKS_PER_PAGE } from '../constants'

class LinkList extends Component {

  componentDidMount() {
    this._subscribeToNewLinks()
    this._subscribeToNewVotes()
  }

  render() {
    // 1
    if (this.props.feedQuery && this.props.feedQuery.loading) {
      return <div>Loading</div>
    }

    // 2
    if (this.props.feedQuery && this.props.feedQuery.error) {
      return <div>Error</div>
    }

    // 3
    // const linksToRender = this.props.feedQuery.feed.links
    const isNewPage = this.props.location.pathname.includes('new')
    const linksToRender = this._getLinksToRender(isNewPage)
    const page = parseInt(this.props.match.params.page, 10)

    return (
      <div>
        {linksToRender.map((link, index) => (
          <Link key={link.id} index={index} updateStoreAfterVote={this._updateCacheAfterVote} link={link} />
        ))}
        {isNewPage &&
          <div className='flex ml4 mv3 gray'>
            <div className='pointer mr2' onClick={() => this._previousPage()}>Previous</div>
            <div className='pointer' onClick={() => this._nextPage()}>Next</div>
          </div>
        }
      </div>
    )
  }

  _getLinksToRender = (isNewPage) => {
    if (isNewPage) {
      return this.props.feedQuery.feed.links
    }
    const rankedLinks = this.props.feedQuery.feed.links.slice()
    rankedLinks.sort((l1, l2) => l2.votes.length - l1.votes.length)
    return rankedLinks.splice(0, 10)
  }

  _nextPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    console.log(this.props.feedQuery);
    if (page <= this.props.feedQuery.feed.count / LINKS_PER_PAGE) {
      const nextPage = page + 1
      this.props.history.push(`/new/${nextPage}`)
    }
  }

  _previousPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page > 1) {
      const previousPage = page - 1
      this.props.history.push(`/new/${previousPage}`)
    }
  }

  _updateCacheAfterVote = (store, createVote, linkId) => {
    const isNewPage = this.props.location.pathname.includes('new')
    const page = parseInt(this.props.match.params.page, 10)
    const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    const orderBy = isNewPage ? 'createdAt_DESC' : null
    const data = store.readQuery({ query: FEED_QUERY, variables: { first, skip, orderBy } })

    const votedLink = data.feed.links.find(link => link.id === linkId)
    votedLink.votes = createVote.link.votes
    store.writeQuery({ query: FEED_QUERY, data })
  }

  _subscribeToNewLinks = () => {
    this.props.feedQuery.subscribeToMore({
      document: gql`
        subscription {
          newLink {
            node {
              id
              url
              description
              createdAt
              postedBy {
                id
                name
              }
              votes {
                id
                user {
                  id
                }
              }
            }
          }
        }
      `,
      updateQuery: (previous, { subscriptionData }) => {
        const newAllLinks = [...previous.feed.links, subscriptionData.data.newLink.node]
        const result = {
          ...previous,
          feed: {
            __typename: previous.feed.__typename,
            links: newAllLinks
          },
        }
        return result
      },
    })
  }

  _subscribeToNewVotes = () => {
    this.props.feedQuery.subscribeToMore({
      document: gql`
        subscription {
          newVote {
            node {
              id
              link {
                id
                url
                description
                createdAt
                postedBy {
                  id
                  name
                }
                votes {
                  id
                  user {
                    id
                  }
                }
              }
              user {
                id
              }
            }
          }
        }
      `,
    })
  }
}

export const FEED_QUERY = gql`
  # 2
  query FeedQuery($first: Int, $skip: Int, $orderBy: LinkOrderByInput) {
    feed(first: $first, skip: $skip, orderBy: $orderBy) {
      links {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      count
    }
  }
`

// 3
export default graphql(FEED_QUERY, {
  name: 'feedQuery',
  options: ownProps => {
    const page = parseInt(ownProps.match.params.page, 10)
    const isNewPage = ownProps.location.pathname.includes('new')
    const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    const orderBy = isNewPage ? 'createdAt_DESC' : null
    return {
      variables: { first, skip, orderBy },
    }
  },
})(LinkList)
